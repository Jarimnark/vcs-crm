# VCS CRM — Build readiness: what to answer before Phase 1

| | |
|---|---|
| **Status** | Working checklist |
| **Last updated** | 2026-08-11 |
| **Purpose** | What must be answered before building, in the order it actually blocks work |
| **Reads from** | [Product concept](00-product-concept.md) §10, [data model](02-data-model.md) §14, [tech stack](03-tech-stack.md) §13, [infrastructure](04-infrastructure.md) §11 |

---

## 0. The short version

> **Update 2026-08-22 — most of this page is resolved.** B2–B4 and B6–B11
> were answered ([ADR-0046](decisions/0046-client-answers-quotation-and-project-model.md)):
> T&C on a page 2, discount enterable as amount **or** percent (system
> derives the other), `-R2` suffix, terms per quotation, status by hand, no
> progress labels, lost reason free-text (no codes), progress 100 manual,
> cost currencies never mixed. The PDF prototype has also passed its
> checklist (ADR-0045), so nothing blocks the build.
>
> **Still outstanding from the client:** **B1** (a multi-line sample — the
> most valuable input, validates page breaks), **B5** (the current counter
> value — blocks launch seeding, not build), and **T1** (the standard
> terms-&-conditions wording for the new page 2).

| | |
|---|---|
| ~~Blocks the PDF prototype~~ | ✅ prototype passed; B1 still wanted for validation |
| ~~Blocks the quotation builder~~ | ✅ B3/B6 answered; B5 blocks **launch seeding** only |
| ~~Blocks the project model~~ | ✅ B7 answered: by hand |
| Current work | Schema alignment + spec-correct flows + quotation builder — see `CONTEXT.md` |

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

### 2.1 – 2.3 Blocking questions — ✅ answered 2026-08-22, except B1 and B5

Full record: [ADR-0046](decisions/0046-client-answers-quotation-and-project-model.md).

| # | Question | Answer |
|---|---|---|
| **B1** | Multi-line quotation sample | ⏳ **still wanted** — validates row spacing and page breaks against reality |
| **B2** | Is there a page 2? | ✅ **Yes — standard terms & conditions move to page 2.** Wording is company-level (**T1**: get the text from VCS) |
| **B3** | Discount format | ✅ **Either** — enter amount or percent, the system derives and displays the other. `discount_type` records which was entered |
| **B4** | Revision numbering | ✅ Suffix — `QUO69054-R2` |
| **B5** | Current counter value | ⏳ **still needed before launch.** Not year-based: the samples show one continuous no-reset sequence customers recognise; the seed is just the last number VCS used (reasoning in ADR-0046) |
| **B6** | Terms per quotation or line? | ✅ Per quotation (header). T&C per B2 |
| **B7** | Progress/status interaction | ✅ **By hand** — no automatic Won |
| **B8** | Progress labels | ✅ **None** — plain percentages in the UI |
| **B9** | Lost reason codes | ✅ **No codes** — required free text stays |
| **B10** | What triggers 100 (repeat established)? | ✅ Manual — Won and 100 are both human judgements |
| **B11** | Mixed cost currencies? | ✅ Never — header-level FX rate stands |

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
