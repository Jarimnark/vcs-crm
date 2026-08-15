# Phase 1 — Architecture Decisions

**Resolves:** D2, D4, D11, D16, D17 (entity) and C1, C2, C3, C7, C9, C14 (stack and infrastructure).

---

# Part A — Entity Changes

## A1. Terms are per-quotation *(D2 confirmed)*

No change needed — the proposed model already places currency, Incoterm, lead time, country of origin, payment term, and validity on the Quotation header. The terms block prints once, below the last line item, on the final page.

## A2. Quantity is quantity *(D4 confirmed)*

The column is a normal quantity that happens to be governed by supplier MOQ.

- **Internal field name:** `quantity`
- **Printed label:** unchanged — `จำนวนสั่งซื้อขั้นต่ำ / Min. Order Qty`

Clients already recognise the existing form, so the label stays as-is even though the field is a plain quantity. No second column is needed.

Optional, low cost: an `moq_note` field on the line, for cases where the sales engineer wants to state the supplier's minimum explicitly. Skip it unless the user asks.

## A3. Order record per PO — recommended *(D11)*

You were unsure. The recommendation is **yes, include it** — it is small, and without it two things become impossible.

**Why it is needed.** A consumable project now stays open across repeat orders. With a single `amount` field on Project, the moment a second PO arrives you cannot answer:
- How much has this client actually bought this year?
- What is our margin on this relationship over time?

You are already capturing `unit_cost` on every quotation line specifically so margin is reportable. Without an Order record, that cost data has nothing to attach to after the first sale, and the reason for collecting it disappears.

**Proposed entity — seven fields:**

| Field | Notes |
|---|---|
| `project` | Parent |
| `po_number` | Client's PO reference |
| `po_date` | |
| `source_quotation` | Optional — which quotation this PO accepted |
| `amount` | Order value |
| `currency` | |
| `status` | ordered / delivered / invoiced |

**Effect on Project:** `amount` becomes `expected_amount` — a forecast used for pipeline weighting. Actual revenue is the sum of Orders. Reporting reads forecast from Project and actuals from Order.

**Effect on follow-up tasks:** this also resolves D12 cleanly. The follow-up interval counts from the **most recent Order date**, not the won date, so a client who orders early resets the clock naturally.

If you would rather defer this, the fallback is to treat `amount` as first-order-only and accept that repeat revenue is invisible. It is a real loss, and adding Order later means backfilling history by hand.

## A4. Meeting covers multiple projects *(D16 confirmed)*

`Meeting.project` becomes a many-to-many join:

```
Meeting ──1:N── MeetingProject ──N:1── Project
```

**Knock-on to flag:** meeting hours per project become ambiguous. One 3-hour visit covering two projects is *not* 6 hours of effort.

Options:
- **(a)** Count full duration against each project. Simple, but inflates totals.
- **(b)** Split duration evenly across linked projects.
- **(c)** Report meeting hours at account level only, never per project.

Recommend **(c)** for Phase 1 — report hours per account and per user, which is what actually gets used, and avoid a per-project number that would be misleading. Needs a one-line confirmation from the user.

A meeting may also be logged with **no project at all** (relationship visit, introduction call). The join table handles this naturally.

## A5. Task without project *(D17 confirmed)*

`Task.project` becomes **nullable**. A task may attach to a project, to an account only, to a contact only, or to nothing.

**Knock-on:** project-less tasks need somewhere to live in the UI, or they become invisible. Phase 1 needs a **My Tasks** view listing everything assigned to the current user regardless of what it is attached to — this becomes the daily landing page rather than a project-by-project hunt.

## A6. Clean start *(C14 confirmed)*

No data migration. No import tooling needed in Phase 1. Worth adding a small **CSV import for accounts and contacts** only if the user has an existing list they will otherwise retype — confirm, but assume no.

---

# Part B — Infrastructure Within Budget

## B1. The budget and what it rules out

**5,000 THB/year ≈ USD 145–155**, or about **USD 12/month** for everything.

Current DigitalOcean pricing makes the consequences clear:

| Option | Cost | Verdict |
|---|---|---|
| Basic Droplet 512 MB / 10 GB | $4/mo | Too small for Postgres + app |
| Basic Droplet 1 GB / 25 GB | $6/mo | **Target** |
| Basic Droplet 2 GB / 50 GB | $12/mo | Consumes the entire budget alone, no room for backups |
| Managed Postgres | from $15/mo | **Over the whole budget by itself — excluded** |
| Spaces object storage | ~$5/mo | Takes a third of the budget — avoid in Phase 1 |

**Conclusion: one 1 GB droplet running everything.** Self-hosted Postgres, application, and file storage on the same machine.

## B2. Proposed monthly cost

| Item | Cost |
|---|---|
| Basic Droplet, 1 GB / 1 vCPU / 25 GB, Singapore region | $6.00 |
| Weekly automated backups (20% of droplet) | $1.20 |
| Domain name (annualised) | ~$1.00 |
| TLS certificate (Let's Encrypt) | $0 |
| Transactional email (free tier) | $0 |
| Offsite backup copy (free tier object storage) | $0 |
| **Total** | **~$8.20/mo ≈ $98/yr ≈ 3,250 THB/yr** |

Roughly 1,750 THB/year of headroom against the 5,000 THB ceiling.

**Region: Singapore (SGP1)** — DigitalOcean's nearest datacentre to Bangkok, around 30 ms latency. C2 confirmed no Thai residency requirement, so this is fine.

## B3. The critical consequence — PDF generation

**1 GB of RAM decides how the quotation PDF gets built.**

A headless-Chrome approach (Puppeteer, Playwright, Gotenberg) typically consumes 400–700 MB per render. On a 1 GB box also running Postgres and the application, that will run out of memory. This rules out the most common HTML-to-PDF method.

**Recommendation: WeasyPrint** (Python, HTML/CSS to PDF, roughly 100–200 MB per render). It covers every requirement from Part A of the handoff:

| Requirement | WeasyPrint support |
|---|---|
| Repeating table header on each page | `<thead>` repeats natively |
| Rows that do not split across pages | `page-break-inside: avoid` |
| `Page 1/3` numbering | `@page` margin boxes with `counter(page)` and `counter(pages)` |
| Repeating quotation number in header | `string-set` with `content: string(...)` |
| Embedded product images | Standard `<img>` |
| Thai text shaping | Renders via Pango and HarfBuzz — correct tone and vowel mark positioning |

**Thai-specific requirement:** install **libthai** on the server. Thai has no spaces between words, and without libthai the renderer will break lines mid-word. This is a one-line system package that is easy to miss and produces subtly wrong output when absent.

**Font:** **Sarabun** — the Thai government standard document font, free, and includes matching Latin glyphs for the bilingual layout. Noto Sans Thai is the alternative.

**Prototype this first.** Before committing the stack, render a three-page bilingual quotation using the real Thai labels from the samples and confirm page breaks, tone marks, and word wrapping. Half a day now, versus a rebuild later.

## B4. Suggested stack

Chosen for the memory ceiling and for build speed with five users.

| Layer | Choice | Reasoning |
|---|---|---|
| Application | Python + Django | Built-in admin covers picklists and reference data with almost no build effort; native fit with WeasyPrint |
| Database | PostgreSQL, self-hosted on the droplet | Managed Postgres exceeds the entire budget |
| PDF | WeasyPrint + libthai + Sarabun | See B3 |
| Web server | Caddy or Nginx | Caddy handles TLS automatically |
| File storage | Local disk on the droplet | Spaces costs a third of the budget; 25 GB is ample for five users' PDFs and images |
| Email | Brevo, Resend, or similar free tier | See B5 |

Alternatives are reasonable — Rails or Node would work — but the PDF requirement favours Python, and Django's admin is worth real money when the budget is this tight.

**Memory plan for 1 GB:** Postgres tuned small (~200 MB), application (~250 MB), WeasyPrint transient (~200 MB), OS (~100 MB). Add **2 GB swap** as a safety margin. Adequate for five users at low concurrency.

## B5. System-managed login has a hidden dependency *(C9)*

Building your own login means building **password reset**, which means **sending email**. That was not in the requirements.

Two practical notes:
- DigitalOcean blocks outbound SMTP on port 25 by default, so use an **API-based provider** rather than raw SMTP.
- Free tiers cover this volume comfortably — Resend allows roughly 3,000 emails/month free, Brevo around 300/day. Five users resetting passwords occasionally will never approach these limits. Cost stays at zero.

**PDPA obligations.** You are storing client contact names, emails, and phone numbers. System-managed login means you own the security of that data. Minimum bar: Argon2 or bcrypt password hashing, HTTPS enforced, login rate limiting, session expiry, and no personal data in logs or URLs.

## B6. Environments and backups

**Staging.** A permanent second droplet does not fit the budget. But DigitalOcean moved to **per-second billing in January 2026**, so a staging droplet spun up for a few hours before each release costs a few cents. Create it from a snapshot, test, destroy. Note that powering a droplet off does **not** stop billing — it must be destroyed.

**Backups, two layers:**
1. DigitalOcean weekly automated backups ($1.20/mo) — whole-machine recovery
2. Nightly `pg_dump` pushed to a free-tier object store (Backblaze B2 and Cloudflare R2 both offer ~10 GB free) — protects against the droplet itself being the problem

A single droplet with everything on it is a single point of failure. At this budget that is an accepted trade-off, but it makes offsite database dumps non-negotiable rather than optional.

---

# Part C — Remaining Questions

## Budget clarification
**Q1.** Does the 5,000 THB/year cover only hosting, or does it also need to include the domain name and any third-party services? The estimate above assumes it covers everything and still fits.

**Q2.** Is 5,000 THB a hard annual ceiling, or a starting target that could grow if the system proves useful? This matters for Phase 2 — the pricing engine adds no infrastructure cost, but if usage grows beyond five people, the 1 GB droplet becomes the constraint.

## Entity
**Q3.** Confirm the Order record (A3) is approved.
**Q4.** Confirm meeting-hours reporting at account level rather than per project (A4).
**Q5.** Any existing account or contact list to import, or genuinely starting from zero (A6)?

## Still open from the previous round
Not blocking — resolvable during build: progress labels for steps 40/60/80, lost reason codes, final document type list, discount format, revision numbering, multi-page header repetition, and a service quotation sample.
