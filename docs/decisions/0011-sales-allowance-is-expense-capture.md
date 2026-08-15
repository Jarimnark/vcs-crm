# ADR-0011: "Sales allowance" means work-related expenses, captured in Phase 1

- **Status:** ⏸️ Deferred to Phase 2 — see [ADR-0033](0033-expenses-deferred-to-phase-2.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Domain model
- **Resolves:** Open question Q1

> **Deferred 2026-08-11.** Expenses are not in the client's Phase 1 scope. **Deferred, not superseded** — the reasoning below stands and becomes the Phase 2 starting point. The not-backfillable warning is preserved in [ADR-0033](0033-expenses-deferred-to-phase-2.md), along with the reason Phase 1 could not deliver this *well*: mobile access is unconfirmed and there is no object storage for receipts.

## Context

The original brief listed "allowance of sales" among the things the CEO would eventually want to see. This was flagged as a blocking ambiguity (Q1), because the phrase has two common readings in a Thai sales organisation, and they produce entirely different data models:

- **Commission / incentive** — a percentage of closed deal value, calculated after the win. It hangs off the opportunity, is computed periodically, and touches payroll.
- **Work-related expense** — travel, fuel, accommodation, per-diem, customer entertainment (เบี้ยเลี้ยง / ค่าใช้จ่าย). It hangs off the *activity* that incurred it, is captured continuously, and needs receipts.

KK confirmed: **"like the expense the sales make that relate to work."** So it is the second — cost of sales, not compensation.

This matters more than it first appears. An SE visiting a site three hours away spends real money on every deal, and today nobody can connect that spend to whether the deal was won. That is the number the CEO actually wants: not "what did we sell" but "what did it cost us to sell it".

## Options considered

**What it means** — settled by KK's answer. Recorded here because the wrong reading would have produced a compensation feature nobody asked for.

**When to build it**

1. **Phase 3 only**, alongside the CEO dashboard.
   - Pro: keeps Phase 1 tight; expenses are a management concern.
   - Con: the dashboard launches with zero history. Expense data cannot be reconstructed — nobody remembers what they spent on fuel eight months ago, and the receipts are gone. Phase 3 would then need a further year before it says anything useful.
2. **Phase 1 capture, no workflow.** SE records amount, category, and a receipt photo while filing the visit report. No approval, no reimbursement status.
   - Pro: costs little — it is a few fields on a screen the SE is already using, at the moment they still have the receipt in their hand. Builds history from day one.
   - Con: not yet a reimbursement system, so the SE may still submit expenses the old way in parallel for a while.
3. **Full expense management in Phase 1** — submission, approval, reimbursement tracking, policy limits.
   - Pro: complete.
   - Con: a product in its own right, and a direct violation of ADR-0001 — most of that workflow serves finance, not the SE.

## Decision

"Sales allowance" is **work-related expense**, modelled as an `Expense` entity.

**Phase 1 — capture only.** Fields: date, category, amount, currency, receipt photo, note, incurred-by user, optional link to the `Activity` (usually a visit) and optional link to the `Opportunity`.

> **Amended 2026-07-29.** Categories are **travel / fuel / accommodation / entertainment / other**. *Per-diem was proposed and dropped* — KK confirmed VCS does not pay a fixed daily allowance, so every expense is a receipt-backed reimbursement. This simplifies the model: expenses always have an underlying receipt, and there is no allowance-rate table to maintain. Entered from the phone as part of filing a visit report. No approval, no status.

**Phase 2 — workflow.** Manager approval, reimbursement status, policy thresholds.

**Phase 3 — analysis.** Cost of sales per deal, per SE, per principal; expense against won revenue; the CEO view.

Both links are optional: some expenses (a monthly phone bill, a trade show) belong to no single visit or deal.

## Rationale

The decisive argument is that this data is **not backfillable**. Almost everything else in the CRM can be reconstructed later from email, memory, or a spreadsheet. A receipt for fuel on a Tuesday in March cannot. Every month we defer capture is a month of permanently missing history — and Phase 3's whole value is having enough of it to see a pattern.

The capture itself is cheap and lands at exactly the right moment. The SE is already on their phone at the customer's site filing a visit report (per ADR-0002/0010); adding "what did this trip cost" while the receipt is still in their pocket is the least burdensome point in the entire process. Asking the same question three weeks later in an office is how expense systems become hated.

It also passes the ADR-0001 test, which most management-serving features do not: the SE gets reimbursed. Recording an expense against the visit is how they get their money back, so the incentive points the right way without anyone enforcing compliance.

Deferring the approval workflow to Phase 2 keeps Phase 1 honest. Capture is a form; approval is a process, with routing, states, and edge cases. Only the first is needed to start accumulating history.

## Consequences

- The visit-report flow must include an optional expense step. It has to be genuinely optional and skippable — a mandatory expense field on every visit would be an obstacle on the app's most important mobile path.
- Receipt photos are the second image-storage requirement after document photos ([ADR-0010](0010-document-model.md)). Storage, compression, and retention should be designed once for both. Receipts may have a statutory retention period — worth checking.
- Expense amounts are personal-adjacent data. Under the flat visibility model ([ADR-0006](0006-single-tenant-flat-permissions.md)), an SE would see colleagues' expenses. ✅ **Resolved by [ADR-0017](0017-expense-visibility-restriction.md):** expenses — including deal-level totals — are visible only to their owner and the Manager. This is the first exception to flat visibility.
- Expenses carry their own currency and the rate at the expense date ([ADR-0015](0015-multi-currency.md)) — a site visit abroad is expensed in local currency.
- Because Phase 1 has no approval flow, expenses will run in parallel with whatever process exists today. Set that expectation with the team — it is capture-in-addition, not capture-instead, until Phase 2.
- Currency matters here as much as on deals (open question Q5): a site visit abroad is expensed in a foreign currency.

## Revisit when

Phase 2 (approval workflow), or immediately if the team is unwilling to record expenses in a system where colleagues can see them — in which case the visibility exception moves from "before Phase 1 ships" to "now".
