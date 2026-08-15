# VCS CRM — Infrastructure Design

> **Rebaselined on Next.js** ([ADR-0042](decisions/0042-nextjs-stack-choices.md)). Three changes: the memory plan drops the PDF renderer (it is now **off-box**, so the 200 MB render spike leaves the droplet entirely), `next build` runs **in CI and never here**, and provisioning gains two environment variables that fail quietly if missed. Singapore pricing was re-checked: 2 GB consumes the entire budget, 4 GB doubles it — **the 1 GB ceiling is a budget fact, not a provider choice** ([ADR-0041](decisions/0041-nextjs-feasibility.md)).

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Last updated** | 2026-08-11 |
| **Decision record** | [ADR-0036](decisions/0036-infrastructure-single-droplet.md) |
| **Budget** | **5,000 THB/year** — plan lands at ≈3,250 |

---

## 1. The budget is a technical constraint

**5,000 THB/year ≈ USD 145–155**, or about **USD 12/month for everything** — hosting, backups, domain, third-party services.

That does not merely make the system smaller. It changes the architecture:

| Normally you would | Cost | Here |
|---|---|---|
| Managed PostgreSQL | from $15/mo | ❌ **Exceeds the whole annual budget by itself** |
| Object storage for files | ~$5/mo | ❌ A third of the budget — local disk instead |
| A permanent staging droplet | $6/mo | ❌ Ephemeral, per-second billed |
| Headless Chrome for PDF | needs 2 GB+ | ❌ WeasyPrint ([ADR-0035](decisions/0035-tech-stack-django-weasyprint.md)) |
| Celery + Redis | ~$6/mo + RAM | ❌ cron |
| APM / log aggregation | $10–25/mo | ❌ Application error email + free uptime ping |

Two of those reach directly into the application code. Documenting the budget as a technical constraint rather than a commercial one is the point of this document.

## 2. Sizing and cost

| Option | Cost | Verdict |
|---|---|---|
| Droplet 512 MB / 10 GB | $4/mo | Too small for Postgres + app |
| **Droplet 1 GB / 1 vCPU / 25 GB** | **$6/mo** | ✅ **Target** |
| Droplet 2 GB / 50 GB | $12/mo | Consumes the entire budget, no room for backups |

### Monthly

| Item | Cost |
|---|---|
| Droplet — 1 GB / 1 vCPU / 25 GB SSD, **Singapore (SGP1)** | $6.00 |
| DigitalOcean weekly backups (20% of droplet) | $1.20 |
| Domain, annualised | ~$1.00 |
| TLS — Let's Encrypt via Caddy | $0 |
| Transactional email — free tier | $0 |
| Offsite DB backup — free tier object storage | $0 |
| **Total** | **≈ $8.20/mo ≈ $98/yr ≈ 3,250 THB/yr** |

**≈ 1,750 THB/year headroom.**

**Singapore** is DigitalOcean's nearest region to Bangkok, ~30 ms. No Thai data-residency requirement (client C2), so this is fine.

## 3. Machine layout

```
┌─ Droplet: 1 GB / 1 vCPU / 25 GB — SGP1 ───────────────┐
│                                                        │
│  Caddy :443 ── TLS, /_next/static/                    │
│     │ unix socket                                      │
│  Next.js standalone (systemd) ── Node 22               │
│     │                                                  │
│  PostgreSQL 16 :5432 (localhost only)                 │
│                                                        │
│  cron ── curl /api/cron/followups  (01:15)            │
│      └── pg_dump → offsite         (02:30)            │
│                                                        │
│  /srv/crm/            .next/standalone                │
│  /srv/crm/media/      uploads, PDFs, receipts         │
│  /var/lib/postgresql/ data                            │
│  2 GB swap                                             │
└────────────────────────────────────────────────────────┘
        │                │                    │
  Let's Encrypt    B2 / R2 (free)    PDF service (free tier)
                                      WeasyPrint container
```

**`next build` never runs here** — it does not fit in 1 GB. CI builds; the droplet receives the `.next/standalone` output ([`03-tech-stack.md`](03-tech-stack.md) §10).

Postgres binds to `localhost` only. Nothing but Caddy is reachable from the internet.

### Memory

| Component | Budget |
|---|---|
| PostgreSQL, tuned small | ~200 MB |
| Next.js standalone server | ~150–250 MB |
| OS, Caddy, cron | ~100 MB |
| **Steady state** | **≈ 450–550 MB** |
| **Swap** | **2 GB** |

**The PDF renderer is not in this table.** It runs off-box, so the 200 MB transient render spike — which drove the original concurrency semaphore — has left this machine entirely ([ADR-0042](decisions/0042-nextjs-stack-choices.md)).

**Swap is still not optional.** Node's footprint grows toward its maximum rather than settling: Next.js preloads page modules and does not unload them, so budget for the ceiling, not the warm-up.

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10          # swap as insurance, not routine
```

## 4. Backups — two layers

A single droplet with everything on it is a single point of failure. At this budget that is accepted — and it is precisely what makes offsite database dumps **non-negotiable rather than optional**.

### Layer 1 — DigitalOcean weekly ($1.20/mo)

Whole-machine snapshot. Recovers from a corrupted OS or a bad deploy.

**Insufficient alone:** weekly means losing up to seven days of quotations.

### Layer 2 — nightly `pg_dump` offsite (free)

```bash
#!/usr/bin/env bash
# /usr/local/bin/backup-db.sh
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
DST=/var/backups/crm

pg_dump -Fc crm > "$DST/crm-$TS.dump"
tar -czf "$DST/media-$TS.tar.gz" -C /srv/crm media    # ← must not be forgotten
gpg --batch --yes --encrypt -r "$BACKUP_GPG_KEY" "$DST/crm-$TS.dump"

rclone copy "$DST" "b2:vcs-crm-backups/$TS/" --include "*.gpg" --include "*.tar.gz"
find "$DST" -mtime +7 -delete
```

**Include the media directory.** Uploaded documents and generated quotation PDFs sit on the same disk as the database. A dump without media restores the records and loses the documents — including every quotation ever sent.

Retention: 7 days local, 90 days offsite. Backblaze B2 and Cloudflare R2 both give ~10 GB free, ample at this volume.

**Encrypt before upload.** The dump contains client contact names, emails, and phone numbers — personal data under PDPA (§6).

### Restore must be rehearsed

**Once, before launch.** An untested backup is a hope.

```
1. Create a droplet from the newest DO snapshot
2. Fetch and decrypt the newest offsite dump
3. pg_restore --clean --if-exists -d crm crm-<ts>.dump
4. tar -xzf media-<ts>.tar.gz -C /srv/crm
5. Repoint DNS
6. Verify: latest quotation PDF opens; margin figures intact
```

Write the steps down. Target: under two hours.

| Measure | Value |
|---|---|
| **RPO** — data loss window | ≤ 24 hours |
| **RTO** — time to restore | ~2 hours |

If 24 hours is unacceptable, hourly dumps cost nothing on the same free tier — worth offering to the client (N8).

## 5. Environments

**No permanent staging droplet** — it does not fit the budget.

But DigitalOcean moved to **per-second billing in January 2026**, so staging becomes nearly free:

```bash
doctl compute droplet create crm-staging --image <snapshot-id> --size s-1vcpu-1gb --region sgp1
# ... test ...
doctl compute droplet delete crm-staging      # a few cents for a few hours
```

> ⚠️ **Powering a droplet off does NOT stop billing. It must be destroyed.** Easy and expensive to get wrong.

| Environment | Where |
|---|---|
| Development | Local machines, Postgres in Docker |
| Staging | Ephemeral droplet from a production snapshot, before each release |
| Production | The droplet |

Staging is created from a **production snapshot**, so releases are tested against real data shapes. Scrub or accept the personal data in it — do not leave a staging droplet running with client contacts on it.

## 6. Security and PDPA

The system stores client contact names, emails, and phone numbers — **personal data under Thailand's PDPA**. System-managed login means VCS owns the security of it.

### Minimum bar

| Control | Implementation |
|---|---|
| Password hashing | **Argon2id** (`@node-rs/argon2`) via Better Auth |
| Transport | HTTPS enforced, HSTS, HTTP → HTTPS redirect |
| Login rate limiting | Better Auth's limiter or Caddy-level, per-IP **and** per-account |
| Session expiry | 12 hours; `SESSION_COOKIE_SECURE`, `HTTPONLY`, `SameSite=Lax` |
| CSRF | Next.js compares `Origin` to `Host` on every Server Action. **Set `serverActions.allowedOrigins`** if a proxy or CDN is introduced |
| Server Actions | **Every one authenticates and authorises internally.** They are public POST endpoints; render-time gating is not a boundary ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G1) |
| Framework patching | **Applied promptly, not batched with features.** RSC has had an exploited-in-the-wild RCE (CVE-2025-55182); Dependabot on from day one ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G7) |
| No personal data in logs or URLs | Never a name or email in a query string |
| Backups encrypted at rest | GPG before upload (§4) |
| Firewall | 22, 80, 443 only. Postgres localhost |
| SSH | Key-only, no password, no root login |
| Media files | **Served through an authenticated route handler**, not directly by Caddy — see below |
| Expense receipts | Same authenticated path, **plus the owner/manager rule** ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) |

> **Media access control.** Generated quotation PDFs contain commercial pricing, and expense receipts are personal-adjacent. If Caddy serves `/media/` directly, anyone with the URL can read any quotation — an unguessable URL is not access control. Serve media through a route handler that checks authentication and delegates the transfer to Caddy (`X-Accel-Redirect`-style), so Node is not streaming files. Small cost, and the alternative is an open document store.

### Authentication

**Email and password, system-managed.** This has a dependency the requirements did not mention: **password reset requires sending email.**

- DigitalOcean **blocks outbound SMTP on port 25** by default. An **API-based provider** is required — raw SMTP will not work.
- Free tiers cover this comfortably: Resend ~3,000/month, Brevo ~300/day. Five users resetting passwords occasionally will never approach either.

**Microsoft SSO was considered** (client C9 notes a Microsoft 365 environment) and **rejected for Phase 1**: it adds an Entra app registration, tenant configuration, and a dependency on an admin outside the project, to save five users from remembering one password. Revisit if the user count grows.

## 7. Monitoring

No APM fits the budget. The realistic ceiling:

| Signal | Tool | Cost |
|---|---|---|
| Uptime | UptimeRobot / Better Stack free tier, 5-min HTTPS check | $0 |
| Application errors | Error handler → the email provider | $0 |
| Disk, memory, CPU | DigitalOcean built-in graphs + alert policies | $0 |
| Backup success | Cron emails on failure; **weekly manual check that objects exist offsite** | $0 |
| Postgres | `pg_stat_statements`, checked manually when something feels slow | $0 |

**Alert thresholds:** disk > 80%, memory > 90% for 10 minutes, swap in active use, HTTPS check failing twice.

**A silent backup failure is the most dangerous outcome here.** Cron mailing only on error means a broken cron entry produces silence, which looks identical to success — hence the weekly manual check that objects are actually landing in the bucket.

## 8. Operations

### Locale

| Setting | Value |
|---|---|
| Server timezone | UTC |
| `TIME_ZONE` | `Asia/Bangkok` |
| Storage | UTC (`USE_TZ = True`) |
| Display | Asia/Bangkok |
| Date era | **Christian era** ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) |
| Date format | One enforced format — samples are inconsistent |

### Disk growth

25 GB, with generated PDFs and per-line images accumulating.

| Item | Estimate |
|---|---|
| Quotation PDF | ~200–500 KB |
| Per-line image | ~200 KB–1 MB |
| Receipt photo | ~200–500 KB after resize |
| Uploaded documents | ~1–5 MB |
| Postgres | < 1 GB for years at this volume |

Rough projection: a few GB per year. 25 GB is comfortable for the medium term; a 50 GB volume is $5/month if needed, and the budget has room.

**Resize product images and receipt photos on upload** (Pillow, max ~1600 px) — a phone photo is 4 MB and is no more legible at 300 KB.

### Provisioning — one script, not a checklist

**`provision.sh` is a deliverable, not documentation.** An idempotent, re-runnable shell script committed to the repo that takes a bare Ubuntu droplet to a running system. A wiki page of twelve manual steps is how a rebuild at 2 a.m. goes wrong ([ADR-0037](decisions/0037-maintainer-capability-as-a-constraint.md)).

What it does:

```
1. Ubuntu 24.04 LTS baseline · ufw 22/80/443 · fail2ban · unattended-upgrades
2. 2 GB swap, swappiness 10
3. postgresql-16, tuned (03-tech-stack §8), bound to localhost
4. System packages: libthai0, libpango, libcairo, fonts-sarabun
5. Python 3.12 venv + requirements
6. Caddy with automatic TLS
7. systemd unit for the Next.js server
8. cron: follow-up generation, nightly backup, weekly backup report
9. Seed: company (with the real quotation counter), picklists, users
```

> **⚠️ Two variables that fail quietly if missed** ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G6):
>
> - **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` must be set and stable** across restarts and deploys. Next.js encrypts action closure variables with it; unset means it is regenerated on boot, so Server Actions fail after a restart in a way that looks random rather than like a configuration error.
> - **`CRON_SECRET`** for the follow-up job endpoint. An unauthenticated job route is a public write.
>
> A third belongs here but is not a variable: **Server Action IDs rotate on deploy**, and at least every 14 days regardless. A user mid-session on the old build sees "Failed to find Server Action" — the UI must surface that as a retry, so a refresh recovers them rather than losing a draft quotation.

Then two steps a script cannot do for you:

```
10. Render the PDF prototype and verify Thai output ON THE REAL MACHINE
11. Rehearse a restore end to end
```

Steps 10 and 11 are the ones that get skipped under time pressure. They are in the list because skipping them is how a Thai rendering bug reaches a customer, or a backup turns out to be unrestorable at the moment it is needed.

## 8a. Keeping operations small

KK is not an infrastructure specialist and will be running this alone ([ADR-0037](decisions/0037-maintainer-capability-as-a-constraint.md)). Every item below exists to reduce what has to be held in someone's head.

| Burden | How it is removed |
|---|---|
| Provisioning | `provision.sh`, idempotent, in the repo |
| Deploying | **One command** — `make deploy` |
| TLS renewal | Caddy, automatic. Nothing to remember |
| Postgres tuning | Set once by the script. Never revisited at this scale |
| Backups | Automated, **plus a weekly "backup succeeded" email** — silence must not resemble success |
| Restoring | **Rehearsed once before launch**, steps written down |
| Monitoring | Free-tier uptime ping + application error email. Nothing to operate |
| Knowing what to do when it breaks | **`RUNBOOK.md`** — see below |

### `RUNBOOK.md` — five scenarios, nothing more

A second required deliverable. Covering only what can realistically go wrong:

1. **Site is down** — check Caddy, the Node service, Postgres, disk, in that order
2. **Disk is full** — what to prune, how to attach a volume
3. **Backup emails stopped** — verify cron, verify the bucket
4. **Deploy failed** — how to roll back
5. **Restore needed** — the rehearsed procedure (§4)

Short and specific beats comprehensive. A runbook nobody reads is the same as no runbook.

### Recommended: spend the headroom on removing work

The plan leaves ≈1,750 THB/year unspent. The instinct is to bank it; better to spend it reducing operations.

**The stronger recommendation, to put to the client with question N8:** if the budget can reach **~8,000 THB/year**, managed PostgreSQL at $15/month becomes affordable — and it removes the **largest single operational burden** in this design. No tuning, no `pg_dump` cron, no restore rehearsal, point-in-time recovery included.

The reason to ask has changed since [ADR-0036](decisions/0036-infrastructure-single-droplet.md). It is no longer about resilience in the abstract; it is about matching the system to who has to run it. $180/year to take database operations off a maintainer who does not want to do database operations is good value, not an indulgence.

## 9. Accepted risks

| Risk | Mitigation | Residual |
|---|---|---|
| **Single point of failure** | Snapshots + nightly offsite dumps, rehearsed restore | ~2 h downtime, ≤24 h data loss. Accepted at this budget |
| Up to 24 h data loss | Nightly dump | Hourly available free if the client wants it (N8) |
| 1 GB memory | WeasyPrint, render semaphore, 2 GB swap | Binding constraint beyond ~10 users |
| Disk fills | Monitoring, image resizing | Volume expansion available within budget |
| Silent backup failure | Cron alerts **plus a weekly manual check** | Requires a human habit |
| No object storage | Local disk, included in backups | Fine at this volume; revisit if receipt and image growth accelerates |
| No staging by default | Per-second ephemeral droplet | Requires discipline to actually do it |

## 10. When to change this

| Trigger | Action |
|---|---|
| Users approach 10 | Droplet → 2 GB ($12/mo) — needs budget headroom |
| Disk > 70% | Attach a 50 GB volume ($5/mo) |
| Phase 2 file features | Object storage becomes necessary — **surface at Phase 2 budget** |
| Budget ceiling raised | **Managed Postgres at $15/mo removes a whole class of operational risk** — the highest-value upgrade available, and now actively recommended ([ADR-0037](decisions/0037-maintainer-capability-as-a-constraint.md)) |
| Two concurrent renders become common | 2 GB droplet, then raise the semaphore |

## 11. Open items

| # | Question | Impact |
|---|---|---|
| **N8** | **Can the budget reach ~8,000 THB/year?** If so, managed PostgreSQL removes the largest operational burden from a solo maintainer who is not an infrastructure specialist ([ADR-0037](decisions/0037-maintainer-capability-as-a-constraint.md)). **Now a recommendation, not just a question.** Also: does 5,000 cover domain and third-party services as assumed? | Ops burden, Phase 2 planning |
| ~~N1~~ | ✅ **Resolved** — responsive web ([ADR-0038](decisions/0038-responsive-web-desktop-first.md)) | No infrastructure impact |
| N5 | Due-date reminders by email? | A second cron job and email volume |
| N10 | Broader audit logging? | Small storage growth |
| — | Who holds the DigitalOcean account, domain, GPG backup key, **CI secrets and PDF service account**? | **Bus factor. Decide before launch** |

That last one has no client question behind it and matters as much as any: a single-maintainer project where one person holds the hosting account, the domain, and the only copy of the backup encryption key has a recovery problem no amount of backup automation solves.

---

*Back to [`00-product-concept.md`](00-product-concept.md) · [`02-data-model.md`](02-data-model.md) · [`03-tech-stack.md`](03-tech-stack.md)*
