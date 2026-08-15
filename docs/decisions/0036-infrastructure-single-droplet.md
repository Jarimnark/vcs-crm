# ADR-0036: One DigitalOcean droplet, within a 5,000 THB/year ceiling

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK, following `phase1-architecture-decisions.md` Part B
- **Phase:** Infrastructure

## Context

The annual budget is **5,000 THB ≈ USD 145–155**, or about **USD 12/month for everything** — hosting, backups, domain, and any third-party service. Five users, no ERP integration, no Thai data-residency requirement (client C2).

That figure rules out most of the conventional shape of a small production system:

| Option | Cost | Verdict |
|---|---|---|
| Droplet 512 MB / 10 GB | $4/mo | Too small for Postgres + app |
| **Droplet 1 GB / 25 GB** | **$6/mo** | **Target** |
| Droplet 2 GB / 50 GB | $12/mo | Consumes the whole budget alone, no room for backups |
| Managed PostgreSQL | from $15/mo | **Exceeds the entire annual budget by itself** |
| Spaces object storage | ~$5/mo | A third of the budget — avoided in Phase 1 |

## Decision

**One 1 GB droplet running everything** — application, PostgreSQL, and file storage on the same machine.

### Monthly cost

| Item | Cost |
|---|---|
| Droplet: 1 GB RAM / 1 vCPU / 25 GB SSD, Singapore (SGP1) | $6.00 |
| Weekly automated backups (20% of droplet) | $1.20 |
| Domain name, annualised | ~$1.00 |
| TLS certificate (Let's Encrypt via Caddy) | $0 |
| Transactional email (free tier) | $0 |
| Offsite database backup (free-tier object storage) | $0 |
| **Total** | **≈ $8.20/mo ≈ $98/yr ≈ 3,250 THB/yr** |

**≈ 1,750 THB/year headroom** against the ceiling.

**Region: Singapore (SGP1)** — DigitalOcean's nearest datacentre to Bangkok, ~30 ms. No residency requirement, so this is fine.

### Memory plan

| Component | Budget |
|---|---|
| PostgreSQL, tuned small | ~200 MB |
| Gunicorn, 2 workers | ~250 MB |
| WeasyPrint, transient per render | ~200 MB |
| OS and Caddy | ~100 MB |
| **2 GB swap** | Safety margin |

Swap is not optional here. It is the difference between a slow render and an OOM kill during a customer-facing export.

### Backups — two layers

1. **DigitalOcean weekly automated backups** ($1.20/mo) — whole-machine recovery.
2. **Nightly `pg_dump` pushed to free-tier object storage** (Backblaze B2 or Cloudflare R2, ~10 GB free) — protects against the droplet itself being the problem.

A single droplet with everything on it is a single point of failure. At this budget that is an accepted trade-off, and it is precisely what makes offsite database dumps **non-negotiable rather than optional**. Weekly machine backups alone mean losing up to seven days of quotations.

**Uploaded files and generated PDFs are on the same disk as the database.** The nightly dump must include the media directory, or a restore recovers the records and loses the documents.

**Restore must be rehearsed once before launch.** An untested backup is a hope, not a backup.

### Environments

**No permanent staging droplet** — it does not fit the budget. But DigitalOcean moved to **per-second billing in January 2026**, so a staging droplet created from a snapshot for a few hours before a release costs a few cents.

**Powering a droplet off does not stop billing — it must be destroyed.** Easy and expensive to get wrong.

### Authentication and PDPA

System-managed email and password login. This has a **hidden dependency the requirements did not mention: password reset requires sending email.** Hence the email provider line above, and hence API-based rather than SMTP — DigitalOcean blocks outbound port 25 by default.

Free tiers cover this comfortably: Resend ~3,000 emails/month, Brevo ~300/day. Five users resetting passwords occasionally will never approach either.

**Microsoft SSO was considered** (client C9 notes a Microsoft 365 environment) and rejected for Phase 1: it adds an Entra app registration, tenant configuration, and a dependency on an admin outside the project, to save five users from remembering one password. Worth revisiting if the user count grows.

**PDPA obligations.** The system stores client contact names, emails, and phone numbers — personal data under Thailand's PDPA. System-managed login means VCS owns the security of it. Minimum bar:

- Argon2 or bcrypt password hashing
- HTTPS enforced, HSTS on
- Login rate limiting
- Session expiry
- No personal data in logs or URLs
- Backups encrypted at rest in the offsite store

### Locale

Timezone **Asia/Bangkok**; timestamps stored UTC. Dates **Christian era** ([ADR-0031](0031-quotation-template-and-numbering.md)).

## Rationale

The interesting thing about this budget is that it does not merely make the system smaller — it changes the architecture. Managed Postgres, object storage, a staging environment, and container orchestration are all normal choices that are simply unavailable, and the consequences reach into the application: it is why WeasyPrint rather than headless Chrome ([ADR-0035](0035-tech-stack-django-weasyprint.md)), why cron rather than Celery, and why PDF rendering needs a concurrency lock. Documenting the budget as a technical constraint rather than a commercial one is the point of this record.

Per-second billing for staging is the neatest trick available here: it converts a $6/month line item into roughly a cent per release, and it is the difference between having a staging environment and not.

Offsite dumps being non-negotiable follows directly from the single-machine design. If the droplet is the failure, DigitalOcean's snapshot of that droplet may not help, and a week of lost quotations is not recoverable from anywhere else — there is no ERP holding a second copy ([ADR-0018](0018-no-erp-invoice-boundary.md)). For a system that is the sole record of VCS's commercial pipeline, nightly is the minimum honest interval.

## Consequences

- **Single point of failure, accepted.** Recovery is: create a droplet from the latest snapshot, restore the newest `pg_dump`, restore media, repoint DNS. Rehearse it once and write down the steps.
- Data loss window: up to 24 hours (nightly dump). If that is unacceptable, hourly dumps to the same free tier cost nothing but disk churn — worth offering to the client.
- **25 GB fills eventually.** Generated PDFs plus per-line product images accumulate. Monitor disk; a 50 GB volume is $5/month if needed, and there is headroom for it.
- No object storage in Phase 1 means **Phase 2's expense receipts have nowhere to go** ([ADR-0033](0033-expenses-deferred-to-phase-2.md)). Surface this when Phase 2 budget is discussed.
- 1 GB is the binding constraint on growth. Beyond roughly ten users, the droplet is what needs upgrading — not the stack ([ADR-0035](0035-tech-stack-django-weasyprint.md)).
- No APM or log aggregation fits the budget. Basic uptime monitoring (free tier) plus Django error email is the realistic ceiling.
- **Two budget questions for the client** (their Q1/Q2): does 5,000 THB cover domain and third-party services as assumed here, and is it a hard ceiling or a starting figure? The second matters for Phase 2, where object storage and a larger droplet both become likely.

## Revisit when

User count approaches ten, disk passes ~70%, or Phase 2 adds file-heavy features. Also revisit if the client confirms the budget can grow — managed Postgres removes a whole class of operational risk for $15/month.
