# ADR-0032: No product master in Phase 1 — typed line items with autocomplete

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK, following `adhesive-crm-user-stories.md` §1 and §3.5
- **Phase:** Domain model
- **Supersedes:** [ADR-0014](0014-product-catalogue-in-phase-1.md)

## Context

[ADR-0014](0014-product-catalogue-in-phase-1.md) built a full product catalogue into Phase 1 — product code, bilingual names, spec, principal, category, unit, default cost and price with independent currencies, lead time, datasheet, active flag — on KK's instruction that *"product is needed in phase 1, there will have product code with a detail."*

The client specification explicitly excludes it: **"Phase 1 does not deliver: product master."** Line items are typed manually, with autocomplete from previously entered items. KK confirmed the client spec wins.

The reasoning in the client document is worth quoting because it reframes the problem rather than just cutting scope:

> Typed items accumulate into a real dataset. This is what the Phase 2 product master gets designed from, instead of guesswork.

## Options considered

1. **Keep the Phase 1 catalogue** ([ADR-0014](0014-product-catalogue-in-phase-1.md)).
   - Pro: quoting from a catalogue is faster and more consistent than retyping; product-level reporting works from day one.
   - Con: contradicts the client spec. More seriously, it requires designing the catalogue schema **now**, before anyone knows what VCS's product data actually looks like — and it requires the catalogue to be populated before the first quotation can be issued, which was already flagged as the largest launch-preparation task in [ADR-0019](0019-historical-data-import.md).
2. **Free text only.**
   - Pro: nothing to build.
   - Con: every quotation retypes `1749560 DELO DUALBOND® AD4950 600 g`. Typos in product codes on customer-facing documents, and no consistency to mine later.
3. **Free text plus autocomplete over previously entered items** — the client's model.
   - Pro: near-zero build cost, no seeding required, launch is not blocked. Consistency improves as the dataset grows. The accumulated items become the empirical basis for the Phase 2 catalogue.
   - Con: no structured product reporting in Phase 1. Autocomplete quality is poor on day one and improves over weeks.

## Decision

Option 3. **No `Product` table in Phase 1.**

`QuotationLine` carries `item_code` (free text, optional) and `item_name` as its own data — not a foreign key.

**Autocomplete** suggests from previously entered lines, matching on both code and name, ranked by recency and frequency. Selecting a suggestion fills code, name, unit, and last-used unit price and cost — as **editable defaults**, never constraints. That last point carries over from [ADR-0014](0014-product-catalogue-in-phase-1.md) and remains the right rule: a suggestion that overrides what the user knows about this deal will be worked around.

**Phase 2 designs the product master from the accumulated line data**, not from a blank page.

## Rationale

The argument that changed the answer is not "less scope is better" — it is **sequencing**. A catalogue schema designed now would be designed from two quotation samples. A catalogue schema designed after six months of real typed line items would be designed from several hundred actual products, with their real code formats, unit conventions, and naming patterns visible. The second will be a better catalogue, and the first would probably need migrating into it.

There is also a launch-blocking argument that [ADR-0014](0014-product-catalogue-in-phase-1.md) created and this removes. Under that decision, quoting required a populated catalogue, so cleaning and importing product data became a hard dependency on the first release — non-development work with a long lead time and no way to compress it. Free-text lines remove the dependency entirely: the system is useful on day one with an empty database.

The cost is real: no product-level reporting in Phase 1. VCS cannot ask "which adhesive do we sell most of" from structured data. Accepted, because the same question becomes answerable in Phase 2 *from the Phase 1 data*, which is a better trade than blocking the launch to answer it early.

## Consequences

- Autocomplete needs to be genuinely good, since it is the only defence against typos in customer-facing product codes. Match on code prefix and name substring; rank by recency then frequency; show code and name together so the user can tell near-duplicates apart.
- **The same product will be spelled several ways** in the accumulated data — `DELO DUALBOND AD4950`, `DELO DUALBOND® AD4950 600g`, `AD4950`. Phase 2's catalogue design must expect to deduplicate rather than assume clean input. Worth saying out loud now, because it is the predictable cost of this decision.
- No import tooling is needed for products ([ADR-0027](0027-adopt-client-phase-1-specification.md)), removing the last reason for the import machinery in [ADR-0019](0019-historical-data-import.md).
- `unit_cost` and `cost_currency` remain on every line ([ADR-0031](0031-quotation-template-and-numbering.md)). Cost capture is *not* deferred — only the master data is. This is the point: cost history accumulates from day one so margin is reportable retroactively.
- `QuotationComponent` also uses free-text code and name, for the same reason.
- Phase 2 should treat the distinct set of Phase 1 line items as its **requirements document**, and the migration as a deduplication exercise with a human in the loop.

## Revisit when

Phase 2 begins. The trigger to start designing the catalogue is having enough accumulated line items to see the real patterns — likely a few months of use, not a fixed date.
