# ADR-0033: Expense capture deferred to Phase 2 — with the warning preserved

- **Status:** ⚠️ Partially reversed by [ADR-0039](0039-minimal-expense-capture-reinstated.md)
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Product concept
- **Defers:** [ADR-0011](0011-sales-allowance-is-expense-capture.md), [ADR-0017](0017-expense-visibility-restriction.md)

> **Partially reversed 2026-08-11, same day.** KK subsequently chose to keep **minimal capture** in Phase 1 — see [ADR-0039](0039-minimal-expense-capture-reinstated.md). Two of this record's supporting arguments had already lapsed: mobile access was confirmed ([ADR-0038](0038-responsive-web-desktop-first.md)), and receipt images gained a home once per-line quotation images required media storage anyway. **What survives:** the approval workflow stays in Phase 2, and the not-backfillable warning below is the reason capture was reinstated rather than deferred.

## Context

Two earlier decisions established expense capture as Phase 1 scope:

- [ADR-0011](0011-sales-allowance-is-expense-capture.md) resolved that "sales allowance" means receipt-backed work expenses, not commission, and put capture in Phase 1 on the grounds that **expense data cannot be backfilled**.
- [ADR-0017](0017-expense-visibility-restriction.md) restricted expense visibility to the owner and manager, on the grounds that SEs who feel watched stop recording, which destroys the dataset.

The client's Phase 1 specification does not mention expenses anywhere. KK's instruction: **defer to Phase 2 explicitly** — not dropped, and not silently lost.

## Options considered

1. **Keep in Phase 1** against the client spec.
   - Pro: the not-backfillable argument is genuinely strong and does not weaken with time.
   - Con: builds scope the client did not ask for, on a fixed 5,000 THB/year budget and a defined Phase 1. Expense capture also implies the mobile field-capture flow, which the client has not confirmed is needed at all (their C7).
2. **Drop entirely.** Mark both records superseded.
   - Pro: clean.
   - Con: throws away a finding that cost real analysis, and guarantees the same ground gets re-argued from scratch in Phase 2 with the intervening months of data already lost.
3. **Defer explicitly**, preserving the reasoning.
   - Pro: respects client scope while keeping the warning attached to a live record.
   - Con: none, beyond the honest admission that deferring has a cost.

## Decision

Expense capture is **Phase 2**. No `Expense` table in Phase 1.

[ADR-0011](0011-sales-allowance-is-expense-capture.md) and [ADR-0017](0017-expense-visibility-restriction.md) are marked **Deferred**, not Superseded. Their content stands as written and becomes the Phase 2 starting point rather than needing rediscovery.

**The warning, restated so it is not lost:**

> Expense data cannot be reconstructed. Nobody remembers what they spent on fuel eight months ago and the receipt is gone. Every month expense capture is deferred is a month of history that does not exist. When the management view arrives, it will be able to report only from the date capture began — so a cost-of-sales analysis built in Phase 2 has nothing to say for its first several months.

**The other finding worth carrying forward:** [ADR-0017](0017-expense-visibility-restriction.md) established that expense privacy is a *data quality* mechanism, not a comfort measure. Capture is voluntary, so if colleagues can see the records, people record less or record elsewhere. Whenever Phase 2 builds this, owner-plus-manager visibility must ship with it, not after it. Trust broken once on this does not come back, and the resulting dataset is empty rather than merely imperfect.

## Rationale

Deferring is right despite the argument for keeping it, and the reason is what surrounds the feature rather than the feature itself. Expense capture only works from the phone at the moment the receipt is in hand — that is the entire basis of [ADR-0011](0011-sales-allowance-is-expense-capture.md)'s claim that it is cheap. The client has not confirmed mobile access is needed at all (C7), and the infrastructure is a single 1 GB droplet with no object storage, so receipt images have no proper home yet ([ADR-0036](0036-infrastructure-single-droplet.md)). Building expense capture into a desktop-only web form three weeks after the trip is not a cheaper version of the feature; it is the version that gets ignored.

So the honest position is that Phase 1 cannot deliver expense capture *well*, and delivering it badly would produce a partial dataset plus a bad first impression — worse than starting cleanly in Phase 2 with mobile and storage decided.

Recording it as Deferred rather than Superseded matters because the two words mean different things to a future reader. Superseded says *we were wrong*. Deferred says *this was right and we chose not to do it yet, at a known cost*. The second is the accurate description.

## Consequences

- No `Expense` table, no expense UI, no receipt storage in Phase 1.
- **[ADR-0017](0017-expense-visibility-restriction.md)'s exception to flat visibility disappears for now.** Phase 1 has no record type needing restriction, so visibility is uniformly flat ([ADR-0006](0006-single-tenant-flat-permissions.md)) and the client's D21 is a simpler question than it would have been.
- The Phase 3 cost-of-sales analysis in earlier versions of the concept is removed. Without expenses there is no cost of sales — margin from quotation lines is the only profitability figure available.
- **When Phase 2 starts, three things ship together or not at all:** capture from mobile, receipt image storage, and owner-plus-manager visibility. Any two without the third produces an unused feature.
- Object storage becomes a Phase 2 infrastructure requirement, which the current budget does not accommodate ([ADR-0036](0036-infrastructure-single-droplet.md)). Worth surfacing when the Phase 2 budget is discussed.

## Revisit when

Phase 2 scope is defined, or if the client raises expense tracking themselves — in which case [ADR-0011](0011-sales-allowance-is-expense-capture.md) and [ADR-0017](0017-expense-visibility-restriction.md) are ready to reactivate.
