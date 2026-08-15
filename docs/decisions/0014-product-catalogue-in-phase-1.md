# ADR-0014: Product catalogue in Phase 1, keyed by product code

- **Status:** ⚠️ Superseded by [ADR-0032](0032-product-master-deferred-to-phase-2.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Resolves:** Open question Q4

> **Superseded 2026-08-11.** The client's Phase 1 explicitly excludes a product master. Line items are free text with autocomplete from previous entries, and the accumulated data becomes the basis for the Phase 2 catalogue — see [ADR-0032](0032-product-master-deferred-to-phase-2.md). The **defaults-not-constraints** principle below survives and applies to autocomplete suggestions. Note that this record made a populated catalogue a launch blocker; removing it unblocks launch entirely.

## Context

Open question Q4 asked whether VCS has a defined equipment catalogue or specs every deal from scratch — the answer decided whether a `Product` entity was needed in Phase 1 or whether free-text line items would do.

KK: *"product is needed in phase 1, there will have product code with a detail."*

VCS has product codes. That settles it — and it changes the shape of the line item, because a coded catalogue is the difference between a quotation that is assembled and one that is typed.

## Options considered

1. **Free-text line items only.** Rejected — contradicts the requirement, and with quotation now in Phase 1 ([ADR-0012](0012-quotation-is-phase-1-core.md)) it would mean re-typing model numbers and prices on every quote, with the typos that implies.
2. **Catalogue only** — every line item must reference a product record.
   - Pro: clean data, perfect reporting by product.
   - Con: blocks the SE when quoting something not yet in the catalogue — a one-off part, a custom fabrication, a freight line. In an equipment business that happens constantly.
3. **Catalogue with free-text fallback** — line items normally reference a product, but can be free-text.
   - Pro: fast for the common case, never blocking for the exception.
   - Con: product-level reporting has a free-text tail that must be handled honestly rather than dropped.

## Decision

Option 3. `Product` is a Phase 1 entity:

| Field | Notes |
|---|---|
| `product_code` | Unique, the primary human identifier |
| `name_th`, `name_en` | Bilingual — appears on customer-facing quotations ([ADR-0016](0016-bilingual-thai-english.md)) |
| `description` / `spec` | Free text; the technical detail |
| `principal_id` | Which manufacturer ([ADR-0004](0004-principal-as-first-class-entity.md)) |
| `category` | For grouping and reporting |
| `unit` | pcs, set, lot, metre… |
| `default_unit_cost` + currency | Cost currency is often not the selling currency ([ADR-0015](0015-multi-currency.md)) |
| `default_unit_price` + currency | |
| `lead_time_days` | A recurring customer question |
| `is_active` | Retire without deleting — history must stay intact |
| `datasheet` | Attached file |

`QuotationLineItem` carries an **optional** `product_id`. When set, the line pre-fills from the catalogue but the SE can still override price, cost, and description on that line — catalogue values are defaults, not constraints.

> **Amended 2026-07-29.** This originally applied to `OpportunityLineItem` too; that entity has since been removed ([ADR-0026](0026-opportunity-value-not-line-items.md)), so quotation lines are the only place a product is referenced.

When `product_id` is null, the line is free text and must still carry its own description, cost, and price.

## Rationale

Defaults-not-constraints is the important part. A catalogue that overrides what the SE knows about a specific deal will be worked around, usually by putting the real numbers in the description field, which is worse than no catalogue at all. Pre-filling gives the speed benefit; the override keeps the SE in control of their own quote.

The optional foreign key is what keeps the SE unblocked. Freight, installation labour, a bracket fabricated for one customer — none of these belong in a catalogue, and requiring a product record for them would stall the quote. Making the reference optional costs one nullable column and removes the entire class of "I can't quote this because it isn't in the system" complaints.

Storing cost and price currencies separately on the product matters more than it looks: VCS buys from principals in USD or EUR and sells in THB, so a product's cost and its price are usually not in the same currency. Collapsing them into one currency field would make every margin figure wrong.

## Consequences

- Someone must own catalogue maintenance. At VCS's size this is the manager, and it is ongoing work — stale prices are worse than absent ones.
- Product-level reports must show free-text lines as an explicit "uncatalogued" bucket rather than silently omitting them. If that bucket is large, the catalogue has gaps worth fixing.
- Product data needs seeding before launch — a spreadsheet import is almost certainly the way in ([ADR-0019](0019-historical-data-import.md)).
- `is_active` rather than deletion: a discontinued product must still render correctly on a two-year-old quotation.
- Catalogue prices are defaults captured at quote time. A price change must not retroactively alter issued quotations — line items store their own values, they do not look them up.
- Bilingual names double catalogue entry effort. If a Thai or English name is missing, the quotation falls back to the other rather than rendering blank.

## Revisit when

The catalogue grows past a few hundred items, at which point search, categories, and bulk price updates need real attention. Also revisit if the uncatalogued line-item share stays high — it would mean the catalogue is not matching how VCS actually sells.
