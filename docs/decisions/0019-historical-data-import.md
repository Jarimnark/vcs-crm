# ADR-0019: Spreadsheet import for seed data, on a best-effort basis

- **Status:** ⚠️ Superseded by [ADR-0027](0027-adopt-client-phase-1-specification.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept
- **Resolves:** Open question Q7

> **Superseded 2026-08-11.** The client confirmed a **clean start** — no data migration and no import tooling in Phase 1, with an optional CSV for accounts and contacts only. The Tier-1 argument below rested on the product catalogue being a launch blocker; [ADR-0032](0032-product-master-deferred-to-phase-2.md) removed the catalogue, and with it the reason to build import machinery.

## Context

Open question Q7 asked whether existing historical data was worth importing. KK: *"if the previous history data can import, it is benefit."*

That is a *nice to have*, not a requirement — and the phrasing matters, because import work has a habit of consuming far more effort than expected when the source data is informal. VCS has no CRM today ([§1 of the product concept](../00-product-concept.md)); the data lives in personal spreadsheets and email, so quality and format will vary by person.

There is also a hard dependency in the other direction: the product catalogue ([ADR-0014](0014-product-catalogue-in-phase-1.md)) has to be populated before anyone can quote anything, and nobody is typing several hundred product codes by hand.

## Options considered

1. **No import** — start clean, enter new deals only.
   - Pro: zero build cost.
   - Con: leaves the catalogue empty on day one, which blocks quotation. Also loses account and contact history that SEs would otherwise have to keep looking up elsewhere.
2. **Full historical migration** — every past deal, with activity history and documents.
   - Pro: complete history from launch.
   - Con: disproportionate effort against informal source data, and most of it will never be read. Closed deals from three years ago have little operational value.
3. **Tiered import** — a required import path for reference data, best-effort for history.
   - Pro: unblocks launch; captures the history that is actually useful; caps the effort.
   - Con: needs a judgement call about where the line sits.

## Decision

Option 3, in two tiers.

**Tier 1 — required before launch.** A CSV/Excel import for reference data that the app cannot function without:

- `Product` catalogue — the blocking one ([ADR-0014](0014-product-catalogue-in-phase-1.md))
- `Account` and `Contact`
- `Principal`

**Tier 2 — best effort, after launch.** Open opportunities and recent closed deals (roughly the last 12 months, to give the win/loss report something to say on day one). Imported with whatever fields exist; missing data is left blank rather than guessed.

**Explicitly not imported:** historical activities, meeting notes, expenses, and documents. These stay in their original locations. Anyone needing an old document goes and finds it — the same as today.

**Import is an admin tool, not a product feature.** A Manager-only screen with template download, column mapping, a dry-run validation pass that reports errors before writing anything, and a per-import batch tag so a bad run can be identified and reversed.

## Rationale

The catalogue import is the part that is not optional, and it is easy to overlook because it does not feel like "historical data". Quotation is a Phase 1 core requirement ([ADR-0012](0012-quotation-is-phase-1-core.md)) and quoting needs products; a Phase 1 launch with an empty catalogue would fail on its most important feature. That alone justifies building the import machinery, after which the marginal cost of pointing it at accounts and opportunities is small.

The 12-month cut on closed deals is chosen for a specific reason: the win/loss report is one of the five Phase 1 reports ([ADR-0008](0008-fixed-reports-over-report-builder.md)), and a report with no data is a report nobody opens again. Seeding roughly a year makes it useful immediately. Older deals add little and cost the same per row to clean.

Leaving activities and documents out is where the effort is actually saved. That data is the highest-volume, lowest-quality, and least-referenced part of the history — and unlike the catalogue, nothing breaks without it.

The dry-run pass is worth calling out. Informal spreadsheets contain merged cells, inconsistent date formats, blank rows, and duplicate codes. An import that half-succeeds and leaves partial data is significantly worse than one that refuses to start, because the resulting mess has to be found and unpicked by hand.

## Consequences

- Import tooling is on the Phase 1 critical path because of the catalogue, and should be built early enough to be used repeatedly during data preparation — the first attempt will not be the last.
- Someone has to clean the source spreadsheets. This is likely the largest human-effort item in launch preparation, and it is not a development task. Plan for it explicitly.
- Imported opportunities need a stage assigned. If the source has no equivalent, they land in a sensible default and get corrected by their owner — better than blocking the import.
- Multi-currency ([ADR-0015](0015-multi-currency.md)) applies to imported amounts: rows need a currency, and historical rates need to come from somewhere. Defaulting to THB where absent is acceptable, but should be recorded rather than silent.
- Bilingual product names ([ADR-0016](0016-bilingual-thai-english.md)) will often be half-populated in the source. Fallback behaviour handles this; do not block the import on it.
- Batch tagging means a bad import can be identified and rolled back. Without it, the only recovery is a database restore.

## Revisit when

After the first real import attempt — the data will be worse than expected, and the tier boundary may need to move.
