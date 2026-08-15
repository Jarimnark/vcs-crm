# ADR-0027: Adopt the client Phase 1 specification as authoritative

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Product concept / Domain model / Infrastructure
- **Source:** `user-story/` — four client documents dated 2026-08-10

## Context

Four documents arrived from the client, superseding the design work done to date:

| File | Contains |
|---|---|
| `adhesive-crm-user-stories.md` | Phase 1 scope, project model, data model, user stories, reporting |
| `phase1-design-handoff.md` | Multi-page quotation behaviour, proposed entity design, 36 open questions |
| `quotation-template-spec.md` | Template derived from two live quotation samples (QUO69054, QUO69041) |
| `phase1-architecture-decisions.md` | Entity resolutions, stack recommendation, infrastructure within budget |

KK has designated these the **trusted source of knowledge**. Where they conflict with earlier decisions in this log, they win.

This is a significant event for the project: roughly half the existing decision records are affected, and several are contradicted by answers KK had previously given directly. That makes an umbrella record necessary — otherwise the log would show a series of unexplained reversals, and the next reader would have no way to tell which decisions are live.

**The most important correction is the business itself.** This log described VCS as selling "industrial and engineering equipment". VCS distributes **adhesives** (DELO products) together with the dispensing and curing equipment, spare parts, and services around them. KK confirmed the adhesive framing is correct and the earlier description was an incomplete read of the original brief. That is not cosmetic — it explains the four project types, the MOQ column, the country-of-origin field, and the restricted-chemical import-permission paragraph, none of which made sense under the previous framing.

## Decision

The client specification is the baseline. This log continues, with the following disposition of prior records.

### The precedence rule

KK set the standing policy for conflicts, and it applies to every future round of client input, not just this one:

> **Where the client specification speaks, it wins. Where it is silent, our decision stands — marked as needing client confirmation. Nothing disappears quietly.**

The third clause is the one that does work. A specification that omits something is not the same as a specification that rejects it, and treating the two identically is how design findings get lost. Two things fall under it here: **expense capture**, which the client never mentions and which is therefore deferred with its reasoning intact ([ADR-0033](0033-expenses-deferred-to-phase-2.md)), and the **multi-currency FX rate**, which the client's model needs but does not include — added as one column with the gap explained ([ADR-0035](0035-tech-stack-django-weasyprint.md)).

### Superseded outright

| Prior record | Replaced by | What changed |
|---|---|---|
| [0009](0009-pipeline-stages.md) → [0024](0024-revised-pipeline-stages.md) → [0025](0025-stage-ladder-with-won-and-completed.md) | [ADR-0028](0028-progress-and-status-are-independent.md) | The named stage ladder is replaced by **two independent fields**: Progress % (10–100 in fixed steps) and Status (Open / Won / Lost) |
| [0014](0014-product-catalogue-in-phase-1.md) | [ADR-0032](0032-product-master-deferred-to-phase-2.md) | No product master in Phase 1. Free-text line items with autocomplete instead |
| [0022](0022-buddhist-era-dates.md) | [ADR-0031](0031-quotation-template-and-numbering.md) | **Christian era**, not Buddhist. Both live samples show 2026 |
| [0023](0023-quotation-belongs-to-an-opportunity.md) | [ADR-0031](0031-quotation-template-and-numbering.md) | Numbering is a global `QUO#####` counter, not derived from the project |
| [0004](0004-principal-as-first-class-entity.md) | [ADR-0034](0034-principal-folded-into-account-types.md) | `Principal` is not a separate entity — an Account with type `manufacturer` |
| [0019](0019-historical-data-import.md) | [ADR-0027](0027-adopt-client-phase-1-specification.md) (this record) | Clean start. No migration, no import tooling. Optional CSV for accounts and contacts only |
| [0026](0026-opportunity-value-not-line-items.md) | [ADR-0030](0030-order-record-per-po.md) | The three-value model is replaced by `Project.expected_amount` plus an **Order** record per PO |

### Deferred to Phase 2

| Prior record | Disposition |
|---|---|
| [0011](0011-sales-allowance-is-expense-capture.md), [0017](0017-expense-visibility-restriction.md) | Expense capture is **not in the client's Phase 1 scope**. Explicitly deferred rather than dropped — see [ADR-0033](0033-expenses-deferred-to-phase-2.md), which preserves the not-backfillable warning |
| [0020](0020-phase-1-scope-reassessment.md) | Remains parked. The client has now defined Phase 1 scope directly, so the milestone proposal is moot |

### Amended, principle intact

| Prior record | Amendment |
|---|---|
| [0006](0006-single-tenant-flat-permissions.md) | Client excludes role permissions from Phase 1. `User.role` is stored but not enforced. Visibility is flat and remains an open client question (D21) |
| [0016](0016-bilingual-thai-english.md) | Bilingual means **fixed labels in Thai + English, entered content in English**. No bilingual data fields — a real simplification |
| [0021](0021-quotation-tax-treatment.md) | Confirmed by the samples: net prices, VAT 7% as a line, grand total. Adds a **VAT toggle** for export and zero-rated sales |
| [0013](0013-documents-are-collected-not-authored.md) | Confirmed and strengthened. Documents are uploaded files — **except quotations**, which the system generates and files automatically |
| [0007](0007-crm-is-not-the-financial-source-of-truth.md), [0018](0018-no-erp-invoice-boundary.md) | Intact. Still no ERP. Invoice remains a *document type* for uploaded files, not an entity the CRM issues |

### Unaffected and still live

[0001](0001-build-for-the-sales-engineer-first.md) (build for the SE first), [0003](0003-phase-boundaries.md) (phase dependency), [0005](0005-unified-activity-timeline.md) (see note below), [0008](0008-fixed-reports-over-report-builder.md) (fixed reports), [0012](0012-quotation-is-phase-1-core.md) (quotation is core — now emphatically confirmed), [0015](0015-multi-currency.md) (multi-currency, with a gap identified below).

> **Note on [0005](0005-unified-activity-timeline.md).** That record merged tasks, meetings, visits, and notes into one `Activity` entity. The client models **Task and Meeting as separate entities** with materially different fields — Meeting has duration, mode, and a many-to-many attendee list; Task has recurrence and an auto-generated flag. The client's split is adopted. ADR-0005's read-pattern argument still applies to the *project timeline view*, which now has to union two tables — an accepted cost, and a smaller one than it was, because the client's Task and Meeting have diverged more than the original four subtypes had.

### Terminology

**"Opportunity" becomes "Project"** throughout, matching the client's and the users' language. `Project` is the entity name in the schema and the label in the UI.

## What the client specification adds

Not present in any earlier version of this design:

- **Four project types** — consumable, equipment, part, service — with different completion semantics ([ADR-0029](0029-project-types-and-repeat-orders.md))
- **Projects continue across repeat orders** for consumables, with system-generated recurring follow-up tasks
- **Optional Part → Equipment parent link**, so spare-part revenue traces to the machine that generated it
- **Account is multi-role** (client / supplier / manufacturer / service provider / logistics), not customer-only
- **`QuotationComponent`** — the un-priced kit breakdown seen in QUO69041
- **`NoteSnippet`** — reusable text blocks such as the Hazardous Substances Control Bureau import-permission paragraph
- **`Company`** singleton for what prints on every document
- **Client snapshot fields** on the quotation, so reprinting an issued document never changes with the account record
- **`ProjectHistory`**, enabling days-in-stage and lost-at-stage reporting
- **Multi-page quotation behaviour** — repeating headers, non-splitting rows, `Page x/y`
- **A decided stack and a costed infrastructure plan** within a 5,000 THB/year ceiling

## Rationale

Adopting the client spec wholesale is correct because most of what it changes, it changes on better evidence than we had. Two live quotation samples beat inference about layout, dates, and numbering. A client statement about repeat-order behaviour beats a designed stage ladder. Where the spec is merely *different* rather than better — terminology, for instance — matching the users' own language wins by default.

Recording the supersessions in one place rather than editing the old records into agreement is deliberate. Several of these reversals overturn answers KK gave directly and confidently, and the useful information is not just the new answer but **the fact that it changed and why**. ADR-0002's reversal earlier in this project turned out to be one of the most instructive entries in the log; the same applies here.

## Consequences

- Documents `00-product-concept.md` and `01-user-flows.md` are rewritten against the new baseline. Three new documents follow: `02-data-model.md`, `03-tech-stack.md`, `04-infrastructure.md`.
- Phase 1 scope is now **smaller in some places** (no product master, no import, no permissions, no expenses) and **larger in others** (recurring task generation, multi-page PDF, kit components, per-line images, Order records).
- **The client spec has a gap this log should not inherit silently: multi-currency margin.** Line items carry `unit_cost` with its own `cost_currency`, while the quotation has a single selling currency. A cost in EUR against a price in THB makes `line_margin` uncomputable without an exchange rate, and the client documents defer FX to Phase 2. Since margin reporting is the stated reason for capturing cost at all, the minimum fix belongs in Phase 1 — see [ADR-0035](0035-tech-stack-django-weasyprint.md) and `02-data-model.md`.
- **The cost-leak risk is the highest-severity item in the build.** The client calls a cost column appearing on a client-facing quotation "a serious commercial problem" and asks for a print whitelist rather than hidden columns. This is treated as an architectural constraint with an automated test, not a template detail.
- Roughly 36 client questions remain open across the four documents. They are consolidated, deduplicated, and prioritised in `00-product-concept.md` §12 rather than left scattered.
- Anyone reading this log from the start should read this record **before** ADRs 0001–0026, or they will build the wrong system.

## Revisit when

The client answers the blocking questions — particularly a multi-line and a service quotation sample, which are the most likely source of further layout change.
