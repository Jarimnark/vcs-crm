# VCS CRM — Manual tasks

| | |
|---|---|
| **Status** | Living checklist — tick items as they complete |
| **Last updated** | 2026-08-11 |
| **Purpose** | Everything that cannot be written in code: accounts, credentials, information to obtain, one-time setup, verification |
| **Companion** | [`05-build-readiness.md`](05-build-readiness.md) — the questions. This file is the actions |

---

## 0. Read this first

**You do not need to register anything to start.** Node 22 and Docker on your laptop run the entire application including the PDF ([ADR-0044](decisions/0044-local-development-droplet-deployment.md)). Everything in §3 onward is deployment-day work and can wait.

**Three items have a lead time or are one-shot. Start or double-check these early:**

| | Item | Why it cannot wait until the end |
|---|---|---|
| ⏳ | **[M2.1] Email domain verification** | DNS propagation plus provider review. Password reset does not work without it, and it is discovered late by everyone who leaves it late |
| ⏳ | **[M1.1] [M1.2] The two client questions** | They gate the PDF prototype, which gates everything else |
| ⚠️ | **[M5.5] Quotation counter seed** | One-shot and unforgiving. Seed it wrong and real quotation numbers collide with documents VCS has already sent |

---

## 1. Information to obtain

Nothing here can be invented — it has to come from someone.

### 1.1 From the client — blocking

- [ ] **[M1.1] A multi-line quotation sample** — three or more lines, ideally spanning two pages. *(B1)*
      Both samples on file carry **one line**, so row spacing, terms placement and page-break behaviour are untested. This is the highest-risk behaviour in the highest-risk component. **Worth a phone call, not an email.**
- [ ] **[M1.2] Is there a page 2 today?** Bank details, terms and conditions, anything after the totals. *(B2)*
      Neither sample shows one. It changes the template structure, not just its content.

### 1.2 From the client — before the quotation builder

- [ ] **[M1.3] Discount format** — fixed amount or percentage? Both samples show `-`. *(B3)*
- [ ] **[M1.4] The current quotation counter value** — the live number, in the high 69000s. *(B5)* → feeds **[M5.5]**
- [ ] **[M1.5] Terms per quotation or per line?** Header-level is assumed and untested. *(B6)*
- [ ] **[M1.6] Do progress and status interact?** Does status become Won automatically, or by hand? *(B7)*
      Two fields kept in agreement manually **will** drift. Decide the rule or inherit the drift.

### 1.3 Company details — for the `company` singleton

Everything that prints on a quotation ([`02-data-model.md`](02-data-model.md) §3.1). Collect in one pass:

- [ ] **[M1.7]** Company name — **Thai and English**
- [ ] **[M1.8]** Address — **Thai and English**
- [ ] **[M1.9]** Phone, tax ID, tax branch (e.g. *Head Office*)
- [ ] **[M1.10]** Logo file — vector or high-resolution PNG
- [ ] **[M1.11]** Quotation footer / thank-you text — Thai and English
- [ ] **[M1.12]** Confirm VAT rate is 7%, and whether any customers are zero-rated or export
- [ ] **[M1.13]** Confirm the date format to standardise on — the samples are inconsistent

### 1.4 The five users

- [ ] **[M1.14]** Full name, email, and **mobile number** for each
      ⚠️ **`phone_mobile` prints in the quotation's Sales Person column.** Anyone who issues quotations must have one, so collect it now rather than discovering it missing at launch.
- [ ] **[M1.15]** Role for each — `ceo` / `finance` / `sales_engineer` / `sales_manager`
- [ ] **[M1.16]** Who is the sales manager for **expense visibility**? That role sees others' expenses ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md))

### 1.5 Seed data

- [ ] **[M1.17]** Lost reason codes — final list *(B9)*
- [ ] **[M1.18]** Document type list *(N6)*
- [ ] **[M1.19]** Incoterms, units, countries in use — starting values for the picklists
- [ ] **[M1.20]** The Hazardous Substances Control Bureau import-permission paragraph, and any other reusable note text
- [ ] **[M1.21]** Confirm minimal expense capture with the client — an addition to their Phase 1 scope *(N11)*
- [ ] **[M1.22]** Ask whether the budget can reach ~8,000 THB/year *(N8)*
      If yes, **managed PostgreSQL** removes the single largest operational burden: no tuning, no `pg_dump` cron, no restore rehearsal, point-in-time recovery included ([ADR-0037](decisions/0037-maintainer-capability-as-a-constraint.md) §3.4). Highest-value upgrade available to this project.

---

## 2. Local setup — do this today

No accounts, no cost.

- [ ] **[M2.0]** Install **Node 22 LTS** and **Docker Desktop**
- [ ] **[M2.1]** Download the **Sarabun** font family (Google Fonts) into `pdf-service/fonts/`
- [ ] **[M2.2]** Create the GitHub repository — private
- [ ] **[M2.3]** Bring up Postgres and the PDF service locally

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: crm
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  pdf:
    build: ./pdf-service
    ports: ["8000:8000"]

volumes: { pgdata: }
```

> **⚠️ Run the PDF prototype in the container, never natively on macOS.**
> The prototype exists to prove **libthai** is present and breaking Thai lines correctly. A native macOS install may not link libthai at all, and macOS's own text stack may handle Thai correctly by another route — so a native run can pass while the server would fail, or fail while the server would pass. **It would be telling you about your laptop, not about the deployment** ([ADR-0044](decisions/0044-local-development-droplet-deployment.md)).

- [ ] **[M2.4]** **Run the PDF prototype and work the ten-item checklist** ([`03-tech-stack.md`](03-tech-stack.md) §3.3)
      This is the first task. Everything downstream assumes it passes.

---

## 3. Accounts to register — deployment day, not before

- [ ] **[M3.1]** **DigitalOcean** account + payment method
- [ ] **[M3.2]** **Domain** — register, point nameservers
- [ ] **[M3.3]** **Transactional email** — Resend or Brevo, free tier
      ⏳ **Start the domain verification early.** SPF/DKIM records, DNS propagation, sometimes provider review. Password reset depends on it ([ADR-0036](decisions/0036-infrastructure-single-droplet.md)).
      Use the **API, not SMTP** — DigitalOcean blocks outbound port 25.
- [ ] **[M3.4]** **Offsite backup store** — Backblaze B2 or Cloudflare R2 (~10 GB free)
- [ ] **[M3.5]** **PDF service host** — Cloud Run, Fly.io or Render free tier *(open item P2)*
      Not urgent: it runs in local Docker until deployment day.
- [ ] **[M3.6]** **Uptime monitoring** — any free tier

---

## 4. Secrets to generate

Generate once, store in a password manager, **never in the repository**.

- [ ] **[M4.1]** `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
      ⚠️ Must be **set and stable across restarts and deploys.** Unset means it regenerates on boot and Server Actions fail after a restart in a way that looks random rather than like configuration ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G6).
- [ ] **[M4.2]** `BETTER_AUTH_SECRET`
- [ ] **[M4.3]** `CRON_SECRET` — the follow-up job endpoint. An unauthenticated job route is a public write.
- [ ] **[M4.4]** `PDF_SERVICE_SECRET` — a render endpoint accepting arbitrary HTML from the internet is an SSRF hazard
- [ ] **[M4.5]** PostgreSQL production password
- [ ] **[M4.6]** SSH keypair for the droplet
- [ ] **[M4.7]** GitHub Actions deploy secrets — SSH key, host, paths
- [ ] **[M4.8]** **GPG keypair for backup encryption**

> ### ⚠️ [M4.9] Store the GPG **private** key somewhere other than the droplet
>
> This is the single most recoverable-from mistake on this page, and the one that is invisible until the worst moment. If the private key exists only on the machine being backed up, then when that machine is lost the offsite backups are **encrypted files nobody can open.** That is not a backup — it is the appearance of one.
>
> Password manager, and a second copy somewhere physical.

---

## 5. Droplet provisioning — one-time

- [ ] **[M5.1]** Create the droplet — **1 GB / 1 vCPU / 25 GB, Singapore (SGP1)** ([ADR-0036](decisions/0036-infrastructure-single-droplet.md))
- [ ] **[M5.2]** DNS A record → droplet IP
- [ ] **[M5.3]** Run `provision.sh` — Node, Postgres, Caddy, swap, systemd, cron, firewall
- [ ] **[M5.4]** Verify by hand:
  - [ ] TLS works, HTTP redirects to HTTPS, HSTS on
  - [ ] **2 GB swap active**, `vm.swappiness=10`
  - [ ] Postgres bound to `localhost` only, tuning applied
  - [ ] Nothing but Caddy reachable from the internet
  - [ ] `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` present and stable across a reboot
- [ ] **[M5.5]** ⚠️ **Seed the quotation counter from [M1.4]**
      **One-shot and unforgiving.** Seed it wrong and the system issues numbers that collide with real documents already sent to customers. Verify the first issued number by hand before anyone uses the system.
- [ ] **[M5.6]** Seed picklists from [M1.17]–[M1.19], note snippets from [M1.20]
- [ ] **[M5.7]** Fill company settings from [M1.7]–[M1.13]
- [ ] **[M5.8]** Create the five users from [M1.14]–[M1.16]
- [ ] **[M5.9]** Deploy the PDF service and point `PDF_SERVICE_URL` at it

---

## 6. Before launch — verification

The items whose absence would be discovered at the worst possible time.

- [ ] **[M6.1]** ⚠️ **Rehearse a restore, end to end**
      New droplet → restore the newest `pg_dump` → restore media → repoint DNS. **Write down the steps as you go** — that is `RUNBOOK.md`, and it must exist before it is needed rather than be reconstructed under pressure. **An untested backup is a hope, not a backup.**
- [ ] **[M6.2]** Confirm the **weekly "backup succeeded" email** arrives. Silence must not look like success.
- [ ] **[M6.3]** Confirm the nightly dump **includes the media directory** — a dump without it restores the records and loses every quotation PDF ever sent
- [ ] **[M6.4]** **Client signs off on a rendered Thai PDF** — printed, not on screen. Tone marks, word breaks, page breaks, the totals block
- [ ] **[M6.5]** Cost-leak sentinel test passing, **against the live PDF service** ([`03-tech-stack.md`](03-tech-stack.md) §4.2)
- [ ] **[M6.6]** Expense visibility verified by logging in **as a non-manager** and attempting to reach another user's expense — by URL and by export, not just by looking at the screen
- [ ] **[M6.7]** Password reset works end to end, on a real mailbox
- [ ] **[M6.8]** A **4 MB phone photo** uploads successfully ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G4)
- [ ] **[M6.9]** Login rate limiting active, per-IP **and** per-account
- [ ] **[M6.10]** Deploy once from CI and confirm the droplet did not run `next build`

### [M6.11] ⚠️ Bus factor — decide before launch

- [ ] Who else has the **DigitalOcean account**?
- [ ] Who else has the **domain registrar** login?
- [ ] Who else has the **GPG private key**? *(see [M4.9])*
- [ ] Who else has the **GitHub / CI secrets** and the **PDF service account**?

> No technical answer exists for this one. A single-maintainer project where one person holds all of it has a recovery problem that no amount of backup automation solves — and it costs nothing to fix now ([ADR-0036](decisions/0036-infrastructure-single-droplet.md) §11).

---

## 7. Ongoing

- [ ] **[M7.1]** **Apply Next.js and React security releases promptly**, not batched with feature work
      RSC has had an exploited-in-the-wild RCE (CVE-2025-55182), in the framework's core request path ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G7). Turn on Dependabot at [M2.2].
- [ ] **[M7.2]** Check the weekly backup email actually arrived
- [ ] **[M7.3]** Watch disk usage — 25 GB fills as PDFs and images accumulate. A 50 GB volume is $5/month if needed
- [ ] **[M7.4]** Watch for a quotation needing **two cost currencies** *(B11)* — if it happens more than rarely, the FX rate moves to the line ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md))

---

## 8. Progress

| Section | Done | Total |
|---|---|---|
| 1 — Information | 0 | 22 |
| 2 — Local setup | 0 | 5 |
| 3 — Accounts | 0 | 6 |
| 4 — Secrets | 0 | 9 |
| 5 — Provisioning | 0 | 9 |
| 6 — Pre-launch | 0 | 11 |
| 7 — Ongoing | — | 4 |

---

*Questions in [`05-build-readiness.md`](05-build-readiness.md) · decisions in [`decisions/`](decisions/README.md)*
