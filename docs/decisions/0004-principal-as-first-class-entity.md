# ADR-0004: Principal (brand/manufacturer) is a first-class entity

- **Status:** ⚠️ Superseded by [ADR-0034](0034-principal-folded-into-account-types.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model

> **Superseded 2026-08-11.** The client models this as `Account.types[]` (multi-select: client / supplier / manufacturer / service_provider / logistics) — a manufacturer is an Account with a role, not a separate entity. See [ADR-0034](0034-principal-folded-into-account-types.md). This record mistook a *relationship* for an *entity type*. Its argument for **why** manufacturer-level reporting matters is still correct and worth rereading when Phase 2 adds the product master — that is when the reporting becomes possible again.

## Context

VCS sells industrial and engineering equipment. In this business the company typically represents or distributes equipment from a set of manufacturers — commonly called *principals*. The principal determines pricing structure, discount authority, lead time, warranty terms, technical support, and often the sales target VCS is held to by that manufacturer.

A generic CRM has no concept of this. The question is whether to model it as a proper entity or just record a brand name on the deal.

## Options considered

1. **Text field on the opportunity** — `principal: "..."`.
   - Pro: free.
   - Con: spelling variants fragment reporting ("Siemens", "SIEMENS", "siemens"). No place to hang principal-level attributes. Cannot express that a deal involves equipment from two principals.

2. **Lookup table (enum) of principal names.**
   - Pro: cheap; fixes the spelling problem; makes "pipeline by principal" reliable.
   - Con: nowhere to store contact details, agreement terms, standard lead times, or targets. Would need promoting later.

3. **First-class entity** — `Principal` with its own record, related to line items and to opportunities.
   - Pro: supports the reporting the business actually needs (performance by principal, target attainment per manufacturer); holds real attributes; correctly models a multi-brand deal at the line-item level.
   - Con: one more entity to build and maintain.

## Decision

`Principal` is a first-class entity. It relates to the line item (each line item is equipment from one principal) and is surfaced on the opportunity as a derived roll-up of its line items' principals.

> **Amended 2026-07-29.** `OpportunityLineItem` no longer exists ([ADR-0026](0026-opportunity-value-not-line-items.md)) — the relationship is to `QuotationLineItem` only. The consequence: **an opportunity has no principal until it has been quoted.** Reports grouping by principal therefore cover Quoted-and-later deals; earlier-stage deals have no principal to group by. The "deals with no line items yet" case noted below is now the normal state of every unquoted opportunity, so handling it visibly rather than silently matters more than when this record was written.

Phase 1 keeps the record minimal: name, contact person, notes, active flag. Attributes such as standard discount tiers, lead times, and annual targets are added in Phase 2 when quotations and targets arrive.

## Rationale

In equipment distribution, "how are we doing with each principal" is a first-order business question — it drives which manufacturers renew the distribution agreement and on what terms. That reporting is impossible to do reliably on a free-text field, and retrofitting an entity later means migrating dirty text data.

Attaching the principal to the line item rather than the opportunity is the important part: a single deal frequently combines a main machine from one manufacturer with instrumentation or ancillaries from another. Putting it on the opportunity would force a wrong choice on exactly the deals that matter most.

The cost is small — a simple reference table with a handful of rows — and the cost of getting it wrong is a data migration.

## Consequences

- Opportunity-level "principal" is a derived value, not a stored one. Reports that group by principal must group via line items, or accept a "primary principal" convention.
- Line items must exist for principal reporting to work, which raises the importance of SEs actually entering them. This is acceptable: line items also drive deal value and margin, so the SE has their own reason to fill them in (per ADR-0001).
- Deals with no line items yet (early-stage enquiries) have no principal. Reports must handle this rather than dropping the rows silently.
- Someone must maintain the principal list. At VCS's size this is a manual, low-frequency task.

## Revisit when

Phase 2, when quotations and targets need principal-level attributes — at which point the record expands. Also revisit if it turns out VCS sells mostly own-brand or bespoke equipment, in which case this entity is over-engineering (relates to open question Q4).
