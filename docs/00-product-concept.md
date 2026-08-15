# VCS CRM — Product Concept

| | |
|---|---|
| **Product** | VCS CRM (working name) |
| **Type** | Internal web application |
| **Owner** | KK |
| **Status** | Draft v1.0 — rebaselined on the client Phase 1 specification |
| **Last updated** | 2026-08-11 |
| **Source of truth** | `user-story/` (client, 2026-08-10) + [decision log](decisions/README.md) |

> **Read this first.** This document was rewritten on 2026-08-11 against a client specification that supersedes much of the earlier design. [ADR-0027](decisions/0027-adopt-client-phase-1-specification.md) records what changed and why. The most important correction: **VCS distributes adhesives** — plus the equipment that dispenses and cures them, its spare parts, and the services around them. Earlier drafts described "industrial and engineering equipment", which was an incomplete read of the original brief.

> **Terminology.** What a generic CRM calls an *Opportunity*, VCS calls a **Project**. `Project` is the entity name and the UI label throughout.

---

## 1. Why this exists

VCS sells adhesives — DELO products — into industrial customers, together with the dispensing and curing equipment, the spare parts for that equipment, and the services around it. The work is done by a team of about **five sales engineers**: half salesperson, half technical specialist. They qualify inquiries, request specifications from suppliers, price offers that combine imported goods with local service, build quotations, and then keep customers reordering.

None of it is in a system today. Deals live in email, in spreadsheets on individual laptops, and in people's heads. Five problems recur:

1. **Every quotation is rebuilt by hand.** Product codes, component lists, terms, and the standard import-permission paragraph are retyped or copy-pasted from old files. Slow, and where errors enter a customer-facing document.
2. **Reorders depend on memory.** Adhesive is consumed and rebought. Nobody is systematically tracking when each account is due to order again, so the reorder happens when the customer remembers — or when a competitor calls.
3. **No shared picture of the pipeline.** "What are we likely to close this quarter" requires asking each engineer individually.
4. **Margin is invisible.** Cost sits in supplier emails, price in the quotation file. Nobody can answer what a deal or an account actually earned.
5. **Documents scatter.** A TDS, an MOQ confirmation, a PO — findable only by whoever filed it.

The CRM's job is to make the engineers' existing work produce structured data as a by-product, so reporting becomes free rather than a tax ([ADR-0001](decisions/0001-build-for-the-sales-engineer-first.md)).

## 2. Vision

> **One place where a VCS sales engineer builds a quotation, tracks a project, and gets told when an account is due to reorder — and where the cost and price they enter once become the margin the business can finally see.**

The bet: if the tool is faster than the spreadsheet for the engineer's own daily work, adoption is voluntary and the reporting comes for free. Build the management dashboard first and data entry becomes overhead, and the data rots.

**The rule that follows:** every field an engineer is asked to fill must earn its place by helping the engineer. Two features carry the product against that test — **quotation generation** (it saves an hour of work per quote) and **reorder follow-up** (it protects revenue they would otherwise lose).

## 3. Who it is for

**~5 users. Standalone system, no ERP integration.**

### Primary — Sales Engineer

- Carries a mix of consumable, equipment, part, and service projects at once.
- Out of the office regularly: customer visits, technical discussions, occasional commissioning.
- Technical and Excel-comfortable. Impatient with software that requires many clicks.
- **Pain:** "Every quotation is half an hour of copy-paste, and I only find out an account stopped ordering when someone asks."
- **Success:** builds a quotation in ten minutes, opens the app and sees exactly what is due today.

### Secondary — Sales Manager

- Runs the team. Needs pipeline position, win/loss reasons, and follow-up compliance.
- Also maintains company settings, picklists, and reusable note snippets.
- **Success:** the pipeline is current without asking anyone.

### Later — CEO / Finance

`User.role` includes `ceo` and `finance`, but **role permissions are not enforced in Phase 1** ([ADR-0006](decisions/0006-single-tenant-flat-permissions.md)). Management reporting arrives once the data is genuinely maintained ([ADR-0003](decisions/0003-phase-boundaries.md)).

### Not users

Customers (no portal), suppliers (supplier-side relationships are Phase 2), accounting (no ERP exists — [ADR-0018](decisions/0018-no-erp-invoice-boundary.md)).

## 4. The project model

The structural core of the system, and the part most different from a conventional CRM.

### 4.1 Two independent fields

| Field | Purpose | Values |
|---|---|---|
| **Progress %** | How far the project has advanced | 10, 20 … 100 — fixed steps |
| **Status** | Whether the project is still live | Open / Won / Lost |

Progress alone cannot distinguish "lost during negotiation" from "still negotiating" — both sit at 70%. **Status carries the outcome; progress carries the position.** Together they answer the most actionable question in win/loss analysis: *what stage do we lose deals at?* ([ADR-0028](decisions/0028-progress-and-status-are-independent.md))

| % | Meaning |
|---|---|
| 10 | Lead received |
| 20 | Inquiry captured |
| 30 | Spec review — internal review, supplier request sent |
| 40 | Proposal / spec confirmed *(label unconfirmed)* |
| 50 | Quoted — issued to client |
| 60 | Client reviewing *(label unconfirmed)* |
| 70 | Negotiation |
| 80 | Final terms agreed — verbal commitment, PO pending *(label unconfirmed)* |
| 90 | Consumable: **Won**. Others: PO imminent |
| 100 | Consumable: **repeat ordering established**. Others: **PO received** |

**Progress may move backwards** — re-quoting drops 70 → 50. Normal, not an error, and logged. Progress **freezes** when a project is lost; that frozen value *is* the lost-at-stage data. Every change writes a `ProjectHistory` row.

### 4.2 Four types, different rhythms

| Type | Endpoint | Special handling |
|---|---|---|
| **Consumable** | 90 Won → 100 repeat established | Recurring follow-up tasks |
| **Equipment** | 100 PO received | — |
| **Part** | 100 PO received | Optional link to the originating equipment project |
| **Service** | 100 PO received | Withholding tax note on quotations |

### 4.3 Consumable projects continue across reorders

**A reorder does not create a new project.** For a consumable, the first order is not the goal — the ordering relationship is ([ADR-0029](decisions/0029-project-types-and-repeat-orders.md)).

When a consumable project is won, it changes mode from *winning the account* to *keeping it ordering*:

- The engineer sets a **follow-up interval in days** (e.g. 45).
- The system generates a follow-up task at that interval.
- **Completing one schedules the next**, one interval ahead.
- The interval counts from the **most recent order date**, so a customer who reorders early resets the clock naturally.
- The engineer can pause or stop recurrence when an account goes dormant.

### 4.4 Three money figures, three purposes

Never added together, never substituted ([ADR-0030](decisions/0030-order-record-per-po.md)):

| Figure | Source | Purpose |
|---|---|---|
| `expected_amount` | Engineer types it | Forecast — weighted by progress |
| `quoted_value` | Derived: latest issued quotation total | Better forecast once a quotation exists |
| **Orders** | One record per PO | **Actual revenue** |

Pipeline value = `Σ (COALESCE(quoted_value, expected_amount) × progress ÷ 100)` over projects with `status = Open`.

## 5. Scope

### In Phase 1

**Accounts & people** — Account with **multi-select types** (client / supplier / manufacturer / service provider / logistics) — a company plays as many roles as it plays ([ADR-0034](decisions/0034-principal-folded-into-account-types.md)). People with position, channel, and decision role.

**Projects** — type, progress, status, lost reason, expected amount, currency, expected close date, owner, lead source, follow-up interval, optional parent equipment project, full change history.

**Quotation** — the centrepiece ([ADR-0012](decisions/0012-quotation-is-phase-1-core.md)):
- Manually typed line items with **autocomplete from previously entered items** — no product master ([ADR-0032](decisions/0032-product-master-deferred-to-phase-2.md))
- **Unit cost captured alongside selling price**, so margin is reportable now and retroactively
- Optional **component list** per line (the un-priced kit breakdown) and an optional **per-line image**
- Terms on the header: currency, Incoterm, payment term, lead time (a paragraph, not a number), country of origin
- **VAT 7%, toggleable** for export and zero-rated sales ([ADR-0021](decisions/0021-quotation-tax-treatment.md))
- **Multi-page PDF** — repeating headers, non-splitting rows, `Page x/y` ([ADR-0031](decisions/0031-quotation-template-and-numbering.md))
- Revisions supersede, keeping full history
- **Exported PDF files itself back to the project automatically**

**Orders** — one per PO: number, date, amount, source quotation, fulfilment status.

**Tasks** — type, due date, assignee, optional project (may attach to an account, a person, or nothing), auto-generated flag, recurrence chain.

**Meetings** — agenda, outcome, duration in hours, mode, internal and external attendees, **may span several projects or none**.

**Documents** — uploaded files by type, versioned. Quotations file themselves ([ADR-0013](decisions/0013-documents-are-collected-not-authored.md)).

**Note snippets** — reusable text such as the Hazardous Substances Control Bureau import-permission paragraph.

**Expenses — minimal capture** ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)). Date, category, amount, currency, receipt photo, optional links to a project and the meeting that incurred it. Captured from a phone. No approval workflow. **Visible only to the person who incurred it and to manager/CEO** — the one enforced permission rule in Phase 1, and it exists for data quality: capture is voluntary, so if colleagues can see the records people record less or record elsewhere ([ADR-0017](decisions/0017-expense-visibility-restriction.md)).

**Reports** — pipeline weighted by progress; win/loss including **lost-at-stage**; margin per project and per line; activity volume per user; follow-up compliance; spare-part revenue traced to its equipment ([ADR-0008](decisions/0008-fixed-reports-over-report-builder.md)).

### Not in Phase 1

| Excluded | Why / where |
|---|---|
| Product master | Phase 2, designed from accumulated line data ([ADR-0032](decisions/0032-product-master-deferred-to-phase-2.md)) |
| Packing / freight calculation | Client-excluded |
| Role permissions | Stored, not enforced ([ADR-0006](decisions/0006-single-tenant-flat-permissions.md)) |
| Expense **approval workflow** | Phase 2. Minimal **capture** is in Phase 1 ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) |
| Data migration / import tooling | Clean start ([ADR-0027](decisions/0027-adopt-client-phase-1-specification.md)) |
| Invoicing | The CRM never issues one ([ADR-0018](decisions/0018-no-erp-invoice-boundary.md)) |
| Email sending | Engineer downloads the PDF and emails it |
| Supplier-side relationships | Phase 2 |
| Offline capability | Disproportionately expensive |

### Phase 2 (indicative)

Product master and pricing engine · packing and freight · supplier relationships and purchase terms · **expense approval and reimbursement workflow, cost-of-sales reporting** · role permissions · manufacturer-level reporting.

## 6. Product shape

1. **My Tasks** — the landing page. Everything assigned to the current user, whatever it attaches to. Project-less tasks would otherwise be invisible ([ADR-0027](decisions/0027-adopt-client-phase-1-specification.md)).
2. **Projects** — list and board, filtered by type, progress, status, owner.
3. **Project detail** — the workspace: account and contact, progress and status, the three money figures, quotations, orders, tasks, meetings, documents, history.
4. **Quotation builder** — type lines with autocomplete, see margin live, export PDF. *The feature that makes the tool worth opening.*
5. **Accounts & people** — records with full history in one view.
6. **Reports** — a fixed set.
7. **Admin** — company settings, picklists, note snippets, users.

### Two things worth stating plainly

**The CRM generates one document and collects the rest.** Quotation is authored here. Everything else — TDS, MOQ confirmation, PO, service report, delivery note, invoice — is uploaded ([ADR-0013](decisions/0013-documents-are-collected-not-authored.md)).

**Cost must never reach a customer.** Line items carry unit cost and margin. The client calls a cost column appearing on a client-facing quotation "a serious commercial problem", and the mitigation is architectural: the PDF renderer receives only whitelisted fields, so cost is *absent* rather than hidden, backed by an automated test ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)). **A second leak path exists on the web side:** a prop handed to a client component ships to the browser even when unused, so cost must not be passed to one ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G2).

## 7. Technology and infrastructure

Decided; details in [`03-tech-stack.md`](03-tech-stack.md) and [`04-infrastructure.md`](04-infrastructure.md).

| | |
|---|---|
| Stack | **Next.js + TypeScript**, PostgreSQL, **WeasyPrint** for PDF as an off-box service ([ADR-0042](decisions/0042-nextjs-stack-choices.md)) |
| Hosting | One DigitalOcean 1 GB droplet, Singapore ([ADR-0036](decisions/0036-infrastructure-single-droplet.md)) |
| Budget | **5,000 THB/year** — plan lands at ≈3,250 |
| Locale | Asia/Bangkok, UTC storage, **Christian era** ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) |

**The budget is a technical constraint, not just a commercial one.** 1 GB of RAM excludes headless-Chrome PDF generation, managed Postgres, object storage, and a permanent staging environment — and those exclusions reach into the application design.

## 8. Success metrics

**Is it being used?**

| Metric | Target |
|---|---|
| **Quotations created in the CRM vs. total sent** | **> 90%** — the single best adoption signal |
| Users opening the app on a working day | > 80% of the team, sustained a month |
| Live projects present in the system | > 90% |
| Open projects with a progress or status change in 14 days | > 70% |
| Won consumable projects with a follow-up interval set | > 90% |
| Auto-generated follow-up tasks completed, not left open | > 70% |

**Is it useful?**

| Metric | Target |
|---|---|
| Time to build a quotation | Meaningfully below today's manual process |
| Monthly pipeline report effort | From ~half a day to near zero |
| Margin reportable per project | From impossible to routine |
| Users who'd be annoyed if it were taken away | Majority, asked directly a month in |

## 9. Key risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Cost leaks onto a customer quotation** | A serious commercial problem, and the client says so explicitly | Field whitelist + automated sentinel test ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) |
| **Float arithmetic reaches a customer total** | This is a quotation system; `0.1 + 0.2 !== 0.3` on a grand total is among the worst outcomes available | Money is a string from Postgres into `decimal.js`; `mode: 'number'` banned ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G3) |
| **Thai PDF rendering fails late** | Quotation is the centrepiece; Thai breaks mid-word without `libthai` and looks subtly wrong rather than erroring | **Prototype a three-page bilingual render before any CRM screen** |
| **1 GB is too tight** | Two concurrent renders can exhaust memory | WeasyPrint not Chrome, render semaphore, 2 GB swap |
| **Won consumables clog every view** | They never close, so they look like neglected work forever | Open/active views must treat won consumables as a separate class ([ADR-0029](decisions/0029-project-types-and-repeat-orders.md)) |
| **Multi-currency margin is uncomputable** | Cost in EUR against price in THB — and margin is the stated reason for capturing cost | One frozen rate per quotation ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) |
| **Single point of failure** | One droplet holds everything, and no ERP holds a second copy | Nightly offsite `pg_dump` including media — non-negotiable |
| **Adoption failure** | Everything downstream collapses | Quotation and reorder follow-up are the carrots; field minimalism everywhere else |
| **Order entry gets skipped** | Actual revenue and margin over time both vanish | Follow-up timing depends on order dates, which aligns the incentive |
| **Expense privacy leaks** | Capture is voluntary; if colleagues can see records, people stop recording and the dataset is empty rather than imperfect | Enforce at the data layer, not the UI ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) |
| **Mixed cost currencies on one quotation** | The FX rate is header-level, so all line costs share a currency | Open question B11 — if common, the rate moves to the line ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) |

## 10. Open questions

Consolidated and deduplicated from the four client documents. **Blocking** means the build should not start on that area.

> **See [`05-build-readiness.md`](05-build-readiness.md) for these sorted by what they actually block.** The short version: only **B1 and B2** block the critical path, and roughly 60% of Phase 1 — accounts, people, projects, tasks, meetings, admin, auth — needs no client answer at all.

### Blocking — quotation output

| # | Question | Source |
|---|---|---|
| **B1** | **A multi-line quotation sample** (three or more lines). Both samples have one line, so row spacing, terms-block placement, and page-break behaviour are all untested — and this is the highest-risk component | Q3, D-A1 |
| **B2** | **Is there a page 2 today?** Neither sample shows bank details or terms and conditions | Q4, D8 |
| **B3** | **Discount format** — amount or percentage? Both samples show `-` | Q8, D5 |
| **B4** | **Revision numbering** — suffix (`QUO69054-R2`) or a new number? *Suffix recommended* | Q6, D6 |
| **B5** | **Current quotation counter value.** The sequence must continue from VCS's existing numbering (high 69000s), not restart | [ADR-0031](decisions/0031-quotation-template-and-numbering.md) |
| **B6** | **Terms per quotation, or per line?** Header-level is confirmed, but untested — a quotation with three origins and three lead times has never been seen | Q1, D2 |

### Blocking — project model

| # | Question | Source |
|---|---|---|
| **B7** | **Do progress and status interact?** Does status become Won automatically at 90 (consumable) / 100 (others), or is it set by hand? Two fields kept in agreement manually will drift | [ADR-0028](decisions/0028-progress-and-status-are-independent.md) |
| **B8** | **Progress labels for 40, 60, 80** — inferred, not stated | Q2, D13 |
| **B9** | **Lost reason codes** — final list. Suggested: price · lead time · competitor · client cancelled · declined by us (margin) · declined by us (technical) · other | Q4, D14 |
| **B10** | **What triggers "repeat ordering established" (100)?** The system cannot detect it. Who decides, on what basis? | [ADR-0029](decisions/0029-project-types-and-repeat-orders.md) |
| **B11** | **Does a quotation ever mix two cost currencies?** The FX rate is header-level, so all line costs share one ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) | Quotation schema |

### Needs an answer before launch

| # | Question | Source |
|---|---|---|
| ~~N1~~ | ~~Mobile access~~ — ✅ **Resolved: responsive web, desktop-first, mobile usable** ([ADR-0038](decisions/0038-responsive-web-desktop-first.md)) | C7, Q6 |
| N2 | **Visibility** — does everyone see all projects, or only their own? `owner_user` exists either way | D21 |
| N3 | **Meeting hours at account level, not per project?** A 3-hour visit covering two projects is not 6 hours. *Account-level recommended* | A4/Q4 |
| N4 | **Task assignment** — can users assign to each other, or self only? | D19 |
| N5 | **Due-date reminders** — in-app only, or email? | D20 |
| N6 | **Document type list** — final dropdown | Q5, D18 |
| N7 | **Project reference number** — does a project need its own, and does it relate to the quotation number? | D15 |
| N8 | **Budget scope** — does 5,000 THB/year cover domain and third-party services? Hard ceiling or starting figure? | Part C Q1/Q2 |
| N9 | **Any account or contact list to import?** Assumed none | A6/Q5 |
| N11 | **Confirm minimal expense capture** — an addition to the client's Phase 1 scope, kept because the data cannot be backfilled ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) | Ours |
| N12 | **Statutory retention period for expense receipts** in Thailand | Deletion policy |
| N10 | **Broader audit logging** beyond progress/status — who edited a quotation, who deleted a record? | C13 |

### Resolvable during build

Withholding tax presentation on service quotations · label standardisation (Incoterm vs Incoterms) · a service quotation sample (Q7/D9) · editable export format such as Word or Excel (Q14/D10) · `moq_note` per line (A2 — skip unless asked).

## 11. Document set

| Document | Status |
|---|---|
| [`00-product-concept.md`](00-product-concept.md) | ✅ This document |
| [`01-user-flows.md`](01-user-flows.md) | ✅ Rewritten on this baseline |
| [`02-data-model.md`](02-data-model.md) | ✅ Table design |
| [`03-tech-stack.md`](03-tech-stack.md) | ✅ Stack and PDF architecture |
| [`04-infrastructure.md`](04-infrastructure.md) | ✅ Hosting, backups, operations |
| [`05-build-readiness.md`](05-build-readiness.md) | ✅ **What to answer before building, in blocking order** |
| [`06-manual-tasks.md`](06-manual-tasks.md) | ✅ **Manual task tracker — accounts, secrets, provisioning, verification** |
| [`decisions/`](decisions/README.md) | 44 records — start at [ADR-0027](decisions/0027-adopt-client-phase-1-specification.md) |

## 12. What happens next

1. **Prototype the quotation PDF.** Three pages, bilingual, real Thai labels from the samples, within ~250 MB. Before any CRM screen — and unchanged by the move to Next.js, since the renderer stays WeasyPrint ([ADR-0041](decisions/0041-nextjs-feasibility.md), [`03-tech-stack.md`](03-tech-stack.md) §3.3).
2. **Get answers to B1–B6** — all block the quotation build. B1 (a multi-line sample) is the single most valuable input outstanding.
3. **Get answers to B7–B10** — small questions that shape the project model.
4. Build in this order: accounts and people → projects with history → quotation and PDF → orders → tasks and meetings → documents → reports.
5. Answer N1–N10 during build, before launch.

---

*Every decision is recorded in the [decision log](decisions/README.md). If you change something here, add a record explaining why.*
