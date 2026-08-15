# VCS CRM — Build readiness: what to answer before Phase 1

| | |
|---|---|
| **Status** | Working checklist |
| **Last updated** | 2026-08-11 |
| **Purpose** | What must be answered before building, in the order it actually blocks work |
| **Reads from** | [Product concept](00-product-concept.md) §10, [data model](02-data-model.md) §14, [tech stack](03-tech-stack.md) §13, [infrastructure](04-infrastructure.md) §11 |

---

## 0. The short version

**You are not blocked on eleven questions. You are blocked on two, and only for one part of the app.**

| | |
|---|---|
| **Blocks the PDF prototype — which is task one** | **B1, B2** |
| Blocks the quotation builder's arithmetic | B3, B5, B6 |
| Blocks the project model | B7 |
| Blocks nothing yet — decide during the build | B4, B8, B9, B10, B11 |
| **Blocks nothing at all** | Accounts, people, projects, tasks, meetings, documents, admin screens, auth — **roughly 60% of Phase 1** |

So: **chase B1 and B2 from the client today**, and build the non-quotation half while you wait. That is the whole answer to sequencing.

---

## 1. Where you build, and what that costs you

**Vercel and Supabase are out** ([ADR-0044](decisions/0044-local-development-droplet-deployment.md)). Development is local; the droplet is needed only to deploy.

**You do not need to register anything to build and test the whole application.** Node 22 and Docker on your laptop cover every Phase 1 feature including the PDF. No account, no card, no droplet.

| | Local | Droplet |
|---|---|---|
| Next.js | `next dev` | `.next/standalone` under systemd |
| PostgreSQL | Docker | Native, tuned for 1 GB |
| WeasyPrint | **Docker — the same image that deploys** | Off-box free tier |
| Cost | **$0** | ~$8.20/mo |

> **One rule, and it is not general tidiness: run the PDF prototype inside the Linux container, never natively on macOS.** The prototype exists to prove **libthai** is breaking Thai lines correctly. A native macOS install may not link libthai at all, and macOS's text stack may handle Thai correctly by another route — so a native run can pass while the server fails, or fail while the server would pass. **It tells you about your laptop, not your deployment.**

**What local development cannot test**, so that "it works on my machine" is not mistaken for readiness: the 1 GB ceiling shared with Postgres, `next build` not fitting on the droplet, swap, Caddy, TLS, systemd, `pg_dump` offsite, **restore rehearsal**, and Bangkok latency. Every operational risk in [ADR-0036](decisions/0036-infrastructure-single-droplet.md) is invisible locally.

Mitigation is cheap: the droplet is $6/month with per-second billing, so it can be created, tested against, and destroyed for pennies — once there is something to deploy.

**Actions for all of this live in [`06-manual-tasks.md`](06-manual-tasks.md).**

---

## 2. Questions for the client

### 2.1 Blocking — get these two first

These block the PDF prototype, and the PDF prototype blocks everything else ([`03-tech-stack.md`](03-tech-stack.md) §3.3).

| # | Question | Why it blocks |
|---|---|---|
| **B1** | **A multi-line quotation sample** — three or more lines, ideally spanning two pages | Both samples you have carry **one line**. Row spacing, terms-block placement and page-break behaviour are entirely untested, and page breaks are the highest-risk part of the highest-risk component |
| **B2** | **Is there a page 2 today?** Bank details, terms and conditions, anything after the totals | Neither sample shows one. It changes the template structure, not just its content |

> **These two are worth a phone call rather than an email.** Everything else on this page can wait a week without costing you anything; these two are the critical path.

### 2.2 Blocking — the quotation builder

| # | Question | Why it matters |
|---|---|---|
| **B3** | **Discount — amount or percentage?** Both samples show `-` | Line arithmetic. Decides whether `discount_type` is needed at all ([`02-data-model.md`](02-data-model.md) §14) |
| **B5** | **The current quotation counter value** | The sequence must continue from VCS's existing numbering, in the high 69000s. Restarting from 1 would collide with real documents already sent ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) |
| **B6** | **Terms per quotation, or per line?** | Header-level is assumed and untested. A quotation with three origins and three lead times has never been seen |
| **B7** | **Do progress and status interact?** Does status become Won automatically at 90/100, or is it set by hand? | Two fields kept in agreement manually **will** drift. Decide the rule now or inherit the drift ([ADR-0028](decisions/0028-progress-and-status-are-independent.md)) |

### 2.3 Decide during the build — do not wait

| # | Question | Default if unanswered |
|---|---|---|
| **B4** | Revision numbering — suffix or new number? | Suffix (`QUO69054-R2`) — recommended |
| **B8** | Progress labels for 40 / 60 / 80 | Display only, no schema impact |
| **B9** | Lost reason codes | Picklist seed data, editable by the client later |
| **B10** | What triggers "repeat ordering established" (100)? | The system cannot detect it — someone decides by hand |
| **B11** | Does a quotation ever mix two cost currencies? | Header-level FX rate assumes not ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)). Watch for it |

### 2.4 Before launch, not before build

| # | Question |
|---|---|
| **N2** | Does everyone see all projects, or only their own? |
| **N3** | Meeting hours at account level rather than per project? *(recommended)* |
| **N4** | Can users assign tasks to each other, or self only? |
| **N5** | Due-date reminders — in-app only, or email? |
| **N6** | Final document type list |
| **N7** | Does a project need its own reference number? |
| **N9** | Any existing account or contact list to import? *(assumed none)* |
| **N10** | Audit logging beyond progress/status? |
| **N11** | **Confirm minimal expense capture** — an addition to their Phase 1 scope, kept because the data cannot be backfilled ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) |
| **N12** | Statutory retention period for expense receipts in Thailand |

### 2.5 The commercial question

| # | Question | Why it matters more than it looks |
|---|---|---|
| **N8** | **Is 5,000 THB/year a hard ceiling or a starting figure — and does it cover the domain and third-party services?** | If it can reach ~8,000, **managed PostgreSQL becomes affordable**, and that removes the single largest operational burden from a solo maintainer: no tuning, no `pg_dump` cron, no restore rehearsal, point-in-time recovery included. This is the highest-value upgrade available to the project ([ADR-0037](decisions/0037-maintainer-capability-as-a-constraint.md) §3.4) |

---

## 3. Questions only you can answer

### 3.1 Before writing any code

| # | Question | Consequence |
|---|---|---|
| **V1** | **Postgres RLS for the expense rule, or the Data Access Layer as specified?** | RLS is a *PostgreSQL* feature — it was never really a Supabase question, and it survives the change of plan. It needs per-request session context, which adds complexity. [ADR-0042](decisions/0042-nextjs-stack-choices.md) G1 specifies a DAL. **Pick one deliberately; drifting between them is how the rule ends up enforced in neither** |
| **V2** | **Where will the PDF service be hosted?** Cloud Run / Fly.io / Render | **No longer urgent** — it runs in local Docker until deployment day ([ADR-0044](decisions/0044-local-development-droplet-deployment.md)). Still open item **P2** |

### 3.2 Before launch — and this one has no technical answer

| # | Question |
|---|---|
| **X1** | **Who else holds the hosting account, the domain, the backup GPG key, the CI secrets and the PDF service account?** |

> A single-maintainer project where one person holds all of it has a recovery problem that no amount of backup automation solves. It costs nothing to fix now and is unfixable at the moment it matters ([ADR-0036](decisions/0036-infrastructure-single-droplet.md) §11).

---

## 4. Suggested order

```
TODAY        Ask the client B1 + B2. Phone, not email.
             Node 22 + Docker + repo. No accounts needed.

WEEK 1       PDF prototype, in the container.
             Ten-item checklist (03-tech-stack.md §3.3).
             ← the gate. Nothing downstream is safe until this passes.

             In parallel — needs no client answers:
             Drizzle schema · Better Auth · accounts · people ·
             projects · tasks · meetings · the four admin screens

WEEK 2+      Quotation builder      ← needs B3, B5, B6
             Progress + status      ← needs B7
             Orders, documents, reports, expenses

             Start email domain verification here — it has
             a lead time and password reset depends on it.

DEPLOY       Register accounts, provision droplet, seed the
             quotation counter (one-shot — verify by hand)

BEFORE       N2–N12 answered · restore REHEARSED · bus factor
LAUNCH       resolved · client signs off on a printed Thai PDF
```

**Every action above is tracked in [`06-manual-tasks.md`](06-manual-tasks.md).**

**The one rule worth repeating:** the PDF prototype comes before any CRM screen. It is half a day, it is the same work under any hosting choice, and it is the only thing here that could invalidate a stack decision ([ADR-0041](decisions/0041-nextjs-feasibility.md)).

---

## 5. What is already decided — do not reopen these

Answered across 44 decision records; listed so they are not re-litigated mid-build.

Framework, ORM, auth, PDF renderer ([ADR-0042](decisions/0042-nextjs-stack-choices.md)) · responsive web, desktop-first ([ADR-0038](decisions/0038-responsive-web-desktop-first.md)) · expenses in Phase 1, capture only ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) · FX rate on the quotation header ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) · no product master ([ADR-0032](decisions/0032-product-master-deferred-to-phase-2.md)) · Progress and Status independent ([ADR-0028](decisions/0028-progress-and-status-are-independent.md)) · one Order per PO ([ADR-0030](decisions/0030-order-record-per-po.md)) · single droplet ([ADR-0036](decisions/0036-infrastructure-single-droplet.md)).

---

*Back to [`00-product-concept.md`](00-product-concept.md) · decisions in [`decisions/`](decisions/README.md)*
