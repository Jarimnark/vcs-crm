# ADR-0017: Expenses are private to their owner and the manager

- **Status:** ⏸️ Deferred to Phase 2 — see [ADR-0033](0033-expenses-deferred-to-phase-2.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Security
- **Amends:** [ADR-0006](0006-single-tenant-flat-permissions.md)
- **Resolves:** Open question Q10

> **Deferred 2026-08-11.** Deferred with [ADR-0011](0011-sales-allowance-is-expense-capture.md). Phase 1 has no record type needing restriction, so visibility is uniformly flat. **Carry forward:** expense privacy is a *data quality* mechanism, not a comfort measure — whenever Phase 2 builds capture, owner-plus-manager visibility ships **with** it, not after.

## Context

[ADR-0006](0006-single-tenant-flat-permissions.md) established flat visibility: at under 10 co-located users, everyone sees all sales data. That record explicitly noted expenses as the likely first exception and flagged it as a call to make before Phase 1 ships.

KK: *"SE cannot see other expense."*

Expense records are personal-adjacent in a way pipeline data is not. They reveal travel patterns, spending habits, and by implication how someone is compensated and how they work. In a small team where everyone knows each other, that visibility is more uncomfortable, not less.

## Options considered

1. **Keep flat visibility.** Rejected — contradicts the requirement, and risks the failure mode identified in [ADR-0011](0011-sales-allowance-is-expense-capture.md): SEs who feel watched simply stop recording expenses, which quietly destroys the Phase 3 cost-of-sales analysis that justified capturing them at all.
2. **Owner + Manager only, no aggregate visibility.** Safe, but means an SE cannot see the total cost of a deal they own — including expenses their colleague incurred on the same deal.
3. **Owner + Manager see records; aggregate totals visible to all.** Individual line items stay private; deal-level expense totals are open.
   - Con: on a deal where only one person expensed anything, the "aggregate" is that person's record with extra steps.

## Decision

**Expense records are visible to their owner and to the Manager role. No other user can see them** — not the list, not the amounts, not the receipts.

Deal-level expense totals are **also restricted** to the owner and Manager. Option 3's aggregate exposure is rejected: on a small team, most deals have expenses from a single person, so an aggregate is a thin disguise. Half-privacy is worse than either alternative because it invites people to reason backwards.

Cost-of-sales analysis ([ADR-0011](0011-sales-allowance-is-expense-capture.md), Phase 3) runs at the Manager/CEO level, where the data is visible by right.

This is a **field- and record-level restriction on one entity**, not a new sharing model. Everything else in [ADR-0006](0006-single-tenant-flat-permissions.md) stands: all sales data remains flat.

## Rationale

The unusual thing about this decision is that privacy here serves *data quality*, not just comfort. Expense capture is voluntary in Phase 1 — there is no approval workflow forcing it. If recording an expense means colleagues can see it, the rational response is to record less, or to record it the old way outside the system. That does not produce a slightly-worse dataset; it produces an empty one, and Phase 3's whole rationale evaporates.

Rejecting the aggregate middle ground follows from team size. With under 10 people and typically one SE per deal, "total expenses on this deal" is usually one person's number. A restriction that can be trivially reversed is not a restriction, and pretending otherwise is worse than being explicit.

## Consequences

- The authorisation module ([ADR-0006](0006-single-tenant-flat-permissions.md) already requires it to be centralised) now has its first record-level rule. It must be enforced in the data-access layer, not the UI — a hidden button is not a permission.
- Every expense query needs an owner filter by default. The safe pattern is to make the restricted query the default and require an explicit, audited escalation for the manager view.
- Opportunity detail shows expense totals conditionally. The UI must not leak the *existence* of hidden expenses through layout shifts or a visible empty section.
- Reports containing expense data are Manager-only ([ADR-0008](0008-fixed-reports-over-report-builder.md)) and must be excluded from SE-level report access.
- CSV export needs the same restriction — export is a common place where permission rules get forgotten.
- When a third role arrives in Phase 3 (CEO/finance), it inherits Manager-level expense visibility.
- Receipt images need the same protection as the records. If files are served by URL, an unguessable URL is not access control.

## Revisit when

Phase 2 introduces an expense approval workflow — an approver who is not the Manager would need visibility. Also revisit if the team grows enough to need a middle management layer.
