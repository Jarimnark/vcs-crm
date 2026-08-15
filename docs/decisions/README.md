# Decision Log

Every design decision on VCS CRM is recorded here — product, infrastructure, and code. The purpose is that anyone joining the project later (including an AI assistant in a fresh session) can reconstruct *why* the system looks the way it does, not just *what* it looks like.

## How to use this log

- **One decision per file.** Named `NNNN-short-title.md`, numbered sequentially.
- **Records are immutable.** If a decision changes, write a new record that supersedes the old one and mark the old one `Superseded by ADR-NNNN`. Never rewrite history — the wrong turns are part of the context.
- **Record the decision when it is made**, not afterwards. A decision recorded a month later is a rationalisation.
- **Small decisions count too.** "We chose Postgres over MySQL because…" is worth three lines. Anything a future reader might reasonably ask "why did they do that?" about belongs here.

## Statuses

| Status | Meaning |
|---|---|
| `Proposed` | Under discussion, not yet acted on |
| `Accepted` | Decided; work proceeds on this basis |
| `Superseded` | Replaced by a later record (linked) |
| `Deprecated` | No longer applies, not replaced |

## Template

```markdown
# ADR-NNNN: <Title>

- **Status:** Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** <who>
- **Phase:** Product concept | Domain model | Infrastructure | Implementation

## Context
What situation forced a decision? What constraints applied?

## Options considered
1. **<Option>** — pros / cons
2. **<Option>** — pros / cons

## Decision
What we chose, stated plainly.

## Rationale
Why this option beat the others, given the constraints.

## Consequences
What becomes easier, what becomes harder, what we accept as a cost.

## Revisit when
The condition that should make us reopen this.
```

## Index

> ⚠️ **Read [ADR-0027](0027-adopt-client-phase-1-specification.md) first.** On 2026-08-11 a client specification arrived and became the trusted source of knowledge. It supersedes seven records and amends six more. [ADR-0037](0037-maintainer-capability-as-a-constraint.md) then adds a constraint neither the client nor ADR-0035/0036 accounted for: who has to maintain this. Reading 0001–0026 without it will produce the wrong system.

**Baseline: the client Phase 1 specification (2026-08-11).**

| # | Title | Status | Date | Area |
|---|---|---|---|---|
| [0027](0027-adopt-client-phase-1-specification.md) | **Adopt the client Phase 1 specification as authoritative** | Accepted | 2026-08-11 | All |
| [0028](0028-progress-and-status-are-independent.md) | Progress % and Status are two independent fields | Accepted | 2026-08-11 | Domain model |
| [0029](0029-project-types-and-repeat-orders.md) | Four project types; consumables continue across repeat orders | Accepted | 2026-08-11 | Domain model |
| [0030](0030-order-record-per-po.md) | An Order record per purchase order | Accepted | 2026-08-11 | Domain model |
| [0031](0031-quotation-template-and-numbering.md) | Quotation template, numbering, and dates — from the live samples | Accepted | 2026-08-11 | Domain model / Product |
| [0032](0032-product-master-deferred-to-phase-2.md) | No product master in Phase 1 — typed lines with autocomplete | Accepted | 2026-08-11 | Domain model |
| [0033](0033-expenses-deferred-to-phase-2.md) | Expense capture deferred to Phase 2 | ⚠️ Partially reversed by [0039](0039-minimal-expense-capture-reinstated.md) | 2026-08-11 | Product |
| [0034](0034-principal-folded-into-account-types.md) | `Principal` is not an entity — Account carries multiple roles | Accepted | 2026-08-11 | Domain model |
| [0035](0035-tech-stack-django-weasyprint.md) | ~~Django~~ + PostgreSQL + **WeasyPrint** — app layer superseded by [0042](0042-nextjs-stack-choices.md), PDF reasoning current | Accepted | 2026-08-11 | Technology |
| [0036](0036-infrastructure-single-droplet.md) | One DigitalOcean droplet, within a 5,000 THB/year ceiling | Accepted | 2026-08-11 | Infrastructure |
| [0037](0037-maintainer-capability-as-a-constraint.md) | **Maintainer capability is a design constraint** — isolate Python, automate operations | Accepted | 2026-08-11 | Technology / Infrastructure |
| [0038](0038-responsive-web-desktop-first.md) | Responsive web, desktop-first, mobile usable | Accepted | 2026-08-11 | Product / Technology |
| [0039](0039-minimal-expense-capture-reinstated.md) | Minimal expense capture reinstated in Phase 1 | Accepted | 2026-08-11 | Product / Domain model |
| [0040](0040-fx-rate-at-quotation-level.md) | One FX rate per quotation, not per line | Accepted | 2026-08-11 | Domain model |
| [0041](0041-nextjs-feasibility.md) | Next.js is feasible for the app, not for the PDF | ✅ Accepted | 2026-08-11 | Technology |
| [0042](0042-nextjs-stack-choices.md) | The Next.js stack, and seven guardrails Django gave free | Accepted | 2026-08-11 | Technology |
| [0043](0043-prototype-environment.md) | ~~Prototype on Vercel + Supabase~~ | ⚠️ Superseded by [0044](0044-local-development-droplet-deployment.md) | 2026-08-11 | Technology / Process |
| [0044](0044-local-development-droplet-deployment.md) | Develop locally in Docker, deploy to the droplet | Accepted | 2026-08-11 | Technology / Process |

**Earlier records (2026-07-29).** Kept in full — the reversals are part of the context.

| # | Title | Status | Area |
|---|---|---|---|
| [0001](0001-build-for-the-sales-engineer-first.md) | Build for the sales engineer first, management second | ✅ Live | Product |
| [0002](0002-engineering-report-as-first-class-entity.md) | Engineering reports are a first-class entity, not attachments | ~~Superseded by [0010](0010-document-model.md) → [0013](0013-documents-are-collected-not-authored.md)~~ | Product |
| [0003](0003-phase-boundaries.md) | Three phases, with Phase 3 gated on Phase 1 adoption | ✅ Live | Product |
| [0004](0004-principal-as-first-class-entity.md) | Principal (brand/manufacturer) is a first-class entity | ~~Superseded by [0034](0034-principal-folded-into-account-types.md)~~ | Domain model |
| [0005](0005-unified-activity-timeline.md) | Tasks, meetings, visits and notes share one Activity model | ⚠️ Partially superseded by [0027](0027-adopt-client-phase-1-specification.md) | Domain model |
| [0006](0006-single-tenant-flat-permissions.md) | Single tenant, two roles, flat data visibility | Live — amended by [0027](0027-adopt-client-phase-1-specification.md) | Product / Security |
| [0007](0007-crm-is-not-the-financial-source-of-truth.md) | The CRM is not the financial source of truth | Live — premise corrected by [0018](0018-no-erp-invoice-boundary.md) | Product / Integration |
| [0008](0008-fixed-reports-over-report-builder.md) | Fixed built-in reports instead of a report builder | ✅ Live | Product |
| [0009](0009-pipeline-stages.md) | Six sales stages, with delivery tracked separately | ~~Superseded by [0024](0024-revised-pipeline-stages.md) → [0028](0028-progress-and-status-are-independent.md)~~ | Domain model |
| [0010](0010-document-model.md) | Templated Document entity, Quotation separate, Invoice by reference | ⚠️ Partially superseded by [0012](0012-quotation-is-phase-1-core.md) / [0013](0013-documents-are-collected-not-authored.md) | Domain model |
| [0011](0011-sales-allowance-is-expense-capture.md) | "Sales allowance" means work-related expenses | ⏸️ Deferred to Phase 2 — [0033](0033-expenses-deferred-to-phase-2.md) | Product / Domain model |
| [0012](0012-quotation-is-phase-1-core.md) | Quotation is a Phase 1 core feature | ✅ Live — emphatically confirmed | Product |
| [0013](0013-documents-are-collected-not-authored.md) | Documents are collected files with metadata, not authored records | ✅ Live — confirmed | Domain model |
| [0014](0014-product-catalogue-in-phase-1.md) | Product catalogue in Phase 1, keyed by product code | ~~Superseded by [0032](0032-product-master-deferred-to-phase-2.md)~~ | Domain model |
| [0015](0015-multi-currency.md) | Multi-currency with frozen rates and a THB reporting base | ✅ Live — minimum form in [0035](0035-tech-stack-django-weasyprint.md) | Domain model |
| [0016](0016-bilingual-thai-english.md) | Bilingual Thai/English | Live — narrowed by [0031](0031-quotation-template-and-numbering.md) | Product / Domain model |
| [0017](0017-expense-visibility-restriction.md) | Expenses are private to their owner and the manager | ⏸️ Deferred to Phase 2 — [0033](0033-expenses-deferred-to-phase-2.md) | Product / Security |
| [0018](0018-no-erp-invoice-boundary.md) | No ERP exists — invoices parked entirely | ✅ Live | Product / Integration |
| [0019](0019-historical-data-import.md) | Spreadsheet import for seed data | ~~Superseded by [0027](0027-adopt-client-phase-1-specification.md)~~ — clean start | Product |
| [0020](0020-phase-1-scope-reassessment.md) | Phase 1 doubled — milestones and a cut list | ⏸️ Parked — client defines scope directly | Product |
| [0021](0021-quotation-tax-treatment.md) | Quotations carry VAT — stored net, displayed net / VAT / gross | ✅ Live — confirmed by the samples | Domain model |
| [0022](0022-buddhist-era-dates.md) | Buddhist era on Thai output | ~~Superseded by [0031](0031-quotation-template-and-numbering.md)~~ — C.E. | Domain model |
| [0023](0023-quotation-belongs-to-an-opportunity.md) | Quotation number derives from the opportunity code | ~~Superseded by [0031](0031-quotation-template-and-numbering.md)~~ — link survives | Domain model |
| [0024](0024-revised-pipeline-stages.md) | Revised pipeline stages — VCS's own ladder | ~~Superseded by [0025](0025-stage-ladder-with-won-and-completed.md) → [0028](0028-progress-and-status-are-independent.md)~~ | Domain model |
| [0025](0025-stage-ladder-with-won-and-completed.md) | Won and Completed are separate stages | ~~Superseded by [0028](0028-progress-and-status-are-independent.md)~~ | Domain model |
| [0026](0026-opportunity-value-not-line-items.md) | Remove `OpportunityLineItem` — opportunity carries values | ~~Superseded by [0030](0030-order-record-per-po.md)~~ — two findings survive | Domain model |
