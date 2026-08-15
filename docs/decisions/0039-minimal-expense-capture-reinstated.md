# ADR-0039: Minimal expense capture reinstated in Phase 1

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Product / Domain model
- **Partially reverses:** [ADR-0033](0033-expenses-deferred-to-phase-2.md)
- **Reactivates, in reduced form:** [ADR-0011](0011-sales-allowance-is-expense-capture.md), [ADR-0017](0017-expense-visibility-restriction.md)

## Context

[ADR-0033](0033-expenses-deferred-to-phase-2.md) deferred expense capture to Phase 2 because the client's Phase 1 specification does not mention it. That record preserved the reasoning but accepted the cost: expense data cannot be backfilled, so a Phase 2 cost-of-sales view would launch with no history.

KK has since chosen to **keep minimal capture in Phase 1** — the `Expense` table and a simple capture form, no approval workflow — and to flag it to the client as a small addition rather than assume it out of scope.

**A note on how this decision was reached, because it affects how much weight to give it.** The question was put to KK twice in the same working session with differently-worded options, and the two answers differed — "move to Phase 2", then "keep minimal capture". That was a process failure on the asking side, not indecision on KK's. This record takes the **later** answer as authoritative. If the intent was in fact to defer, this record should be superseded rather than quietly edited.

The substantive case for reinstating it is unchanged from [ADR-0011](0011-sales-allowance-is-expense-capture.md) and is genuinely strong: **almost everything else in this system can be reconstructed later from email, memory, or a spreadsheet. A fuel receipt from a Tuesday in March cannot.**

Two things also changed since [ADR-0033](0033-expenses-deferred-to-phase-2.md) was written, and both weaken its reasoning:

1. **Mobile is now confirmed** ([ADR-0038](0038-responsive-web-desktop-first.md)). ADR-0033's argument was partly that Phase 1 could not deliver expense capture *well* because mobile was unconfirmed, and desktop-only capture three weeks after the trip is the version that gets ignored. That objection is gone.
2. **Receipt images have a home.** Per-line quotation images already require media storage on the droplet ([ADR-0036](0036-infrastructure-single-droplet.md)), so receipts add volume, not a new capability.

## Options considered

1. **Keep [ADR-0033](0033-expenses-deferred-to-phase-2.md) as written** — Phase 2.
   - Pro: matches the client spec exactly.
   - Con: the history gap, and both of its supporting arguments have since evaporated.
2. **Full expense management** — submission, approval, reimbursement status, policy limits ([ADR-0011](0011-sales-allowance-is-expense-capture.md) option 3).
   - Pro: complete.
   - Con: approval is *process* — routing, states, notifications. A product in its own right, and mostly serving finance rather than the engineer. Directly against [ADR-0001](0001-build-for-the-sales-engineer-first.md).
3. **Minimal capture** — record it, photograph the receipt, nothing else.
   - Pro: history starts now at close to zero build cost. Roughly one table and one mobile-friendly form.
   - Con: not a reimbursement system, so it runs alongside whatever process exists today until Phase 2.

## Decision

**Option 3.** `Expense` is a Phase 1 table.

| Column | Type | Null | Notes |
|---|---|---|---|
| `expense_date` | DATE | | |
| `category` | VARCHAR(20) | | `travel` / `fuel` / `accommodation` / `entertainment` / `other` — **no per-diem** ([ADR-0011](0011-sales-allowance-is-expense-capture.md), amended) |
| `amount` | NUMERIC(15,2) | | |
| `currency` | CHAR(3) | | Trips abroad are expensed locally |
| `receipt_image` | VARCHAR(255) | ✓ | Photographed from a phone |
| `note` | VARCHAR(255) | ✓ | |
| `incurred_by_user_id` | FK → user | | PROTECT |
| `project_id` | FK → project | ✓ | Optional |
| `meeting_id` | FK → meeting | ✓ | Optional — usually the visit that incurred it |

```sql
CHECK (amount > 0)
```
Indexes: `(incurred_by_user_id, expense_date DESC)` · `(project_id) WHERE project_id IS NOT NULL`

**In Phase 1:** capture only. No approval, no reimbursement status, no policy thresholds.

**Visibility is restricted from day one** — an expense is visible to `incurred_by_user` and to the `sales_manager` / `ceo` roles, and to nobody else. **This is the one place role checks are enforced in Phase 1**, despite [ADR-0006](0006-single-tenant-flat-permissions.md) otherwise leaving permissions unenforced.

**Deferred to Phase 2:** approval workflow, reimbursement tracking, policy limits, and cost-of-sales reporting.

**Flag it to the client** as an addition to their Phase 1 scope, with the not-backfillable reasoning — per the precedence rule in [ADR-0027](0027-adopt-client-phase-1-specification.md): where the client spec is silent, our decision stands, marked as needing confirmation.

## Rationale

Capture is a form; approval is a process. That distinction is what makes the minimal version cheap and the full version expensive, and only the first is needed for history to start accumulating. Everything [ADR-0011](0011-sales-allowance-is-expense-capture.md) argued about the *moment* of capture still holds — the engineer is already on their phone logging the visit, and the receipt is still in their pocket. Asking the same question three weeks later in an office is how expense systems become hated.

**The visibility rule is the part not to compromise on**, and it is worth restating why: expense privacy here is a *data quality* mechanism, not a comfort measure ([ADR-0017](0017-expense-visibility-restriction.md)). Capture is voluntary in Phase 1 — no workflow compels it. If colleagues can see the records, the rational response is to record less, or to record elsewhere. That does not produce a slightly worse dataset; it produces an empty one, and the whole reason for reinstating this evaporates.

That is why the restriction ships **with** capture rather than after it. Trust broken once on this does not come back.

Accepting one enforced role check inside an otherwise unenforced permission model is slightly inelegant and clearly correct. The alternative — waiting for the full permission model in Phase 2 — means either shipping capture without privacy (which kills the data) or not shipping capture (which was ADR-0033).

## Consequences

- One table, one mobile-friendly form, one restricted query path. Small.
- **The authorisation module gains its first enforced rule**, so it must exist as a real centralised check rather than scattered template conditionals — [ADR-0006](0006-single-tenant-flat-permissions.md) already required this shape.
- Enforce in the **data-access layer, not the UI**. A hidden button is not a permission, and an unguessable receipt URL is not access control — receipt images go through the authenticated media view ([`04-infrastructure.md`](../04-infrastructure.md) §6).
- Expenses appear on the project timeline **only for those permitted to see them**, and the UI must not leak their existence through layout shifts or an empty section.
- CSV export needs the same restriction. Export is where permission rules are most often forgotten.
- Running alongside the existing reimbursement process until Phase 2. **Set that expectation with the team** — it is capture-in-addition, not capture-instead.
- Receipt images add media volume ([ADR-0036](0036-infrastructure-single-droplet.md)). Resize on upload, same as product images.
- **Statutory retention for receipts in Thailand is unconfirmed** — the old Q11, still open. It affects deletion policy, not the schema.
- The Phase 2 cost-of-sales view now has history to work with from launch, which was the entire point.

## Revisit when

Phase 2 adds the approval workflow — or immediately if the client rejects this as out of scope, in which case [ADR-0033](0033-expenses-deferred-to-phase-2.md) is reinstated and this record superseded.
