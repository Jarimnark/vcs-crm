# ADR-0025: Won and Completed are separate stages; delivery_status is dropped

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Domain model
- **Supersedes:** [ADR-0024](0024-revised-pipeline-stages.md)
- **Resolves:** Open questions Q17, Q20

## Context

[ADR-0024](0024-revised-pipeline-stages.md) adopted VCS's own stage list and flagged two things: that "Completed" was ambiguous (order won, or job delivered?), and that "Follow-up" described an activity rather than a level of commitment and would be confused with "Quoted".

KK resolved both:

- **"Completed" means job delivered.** A separate **Won** stage is therefore required for the point at which the order is received.
- **Remove Follow-up.** Quoted covers the period of chasing a response.

This has a consequence neither of us raised at the time: with Won → Completed in the ladder, **delivery is now inside the pipeline** — which is precisely what [ADR-0009](0009-pipeline-stages.md) argued against.

## Options considered

**Does `delivery_status` survive?**

[ADR-0009](0009-pipeline-stages.md) kept delivery out of the stage ladder and put it in a separate `delivery_status` field, on the grounds that mixing delivery into the pipeline breaks the forecast (a won deal has no probability) and clogs the board.

1. **Keep both** — `Won`/`Completed` stages *and* a `delivery_status` field on won deals.
   - Pro: finer granularity (not started / in delivery / commissioned).
   - Con: two overlapping mechanisms describing the same reality. Two SEs will disagree about which is authoritative, and they will drift apart. This is the clearest kind of model smell.
2. **Drop `delivery_status`.** Won means order received and delivery underway; Completed means delivered and accepted.
   - Pro: one mechanism, no ambiguity. Matches how KK described the business.
   - Con: loses the middle detail. "Won but nothing has shipped yet" and "installed, awaiting sign-off" look identical.
3. **Drop the stages, keep the field** — revert to ADR-0009. Rejected: contradicts KK's explicit answer.

## Decision

**The ladder:**

| # | Stage | Means | Probability | Counts as |
|---|---|---|---|---|
| 1 | **Lead** | Potential customer identified; no request yet | 5% | Open |
| 2 | **Inquiry Received** | Customer has asked for something specific | 15% | Open |
| 3 | **Quoted** | Quotation issued; awaiting or chasing a response | 40% | Open |
| 4 | **Negotiation** | Price, terms, or scope actively being agreed | 75% | Open |
| 5 | **Won** | Order received. Delivery underway | 100% | Closed — booked |
| 6 | **Completed** | Delivered, commissioned, and accepted | 100% | Closed — delivered |
| 7 | **Rejected** | Customer declined or chose a competitor | 0% | Closed — lost |
| 8 | **Dropped** | Went cold, cancelled, or VCS withdrew | 0% | Closed — lost |

**`delivery_status` is dropped.** Stages 5 and 6 express it.

**The forecast sums stages 1–4 only.** Won and Completed are booked, not forecast. This is what protects the forecast now that delivery sits in the ladder — the protection comes from defining which stages are *open*, not from keeping delivery out.

**Reporting distinguishes three things**, and must not conflate them:

- **Booked** — entered Won in the period (the commercial result)
- **Delivered** — entered Completed in the period (the operational result)
- **Open pipeline** — stages 1–4 (the forward view)

## Rationale

Dropping `delivery_status` is the right call because two mechanisms for one fact is worse than one coarse mechanism. Overlapping status fields do not stay in sync — one becomes the real one and the other becomes stale and misleading, and there is no way to tell which from the data.

[ADR-0009](0009-pipeline-stages.md)'s concern was legitimate and is now handled differently rather than ignored. Its worry was that a stage-weighted forecast breaks when delivery steps carry no probability. Defining stages 1–4 as the open pipeline solves that directly: Won and Completed both sit at 100% and are excluded from forecasting, so the forecast is clean regardless of how long a job takes to deliver.

The board-clogging objection stands but is less serious than it looked, and in an equipment business it is arguably a feature — an SE genuinely wants to see what is in delivery, because they stay involved and the customer still calls them. If the Won column becomes unwieldy, the fix is a board filter, not a model change.

Removing Follow-up is a clear improvement. It was the one stage that described what the SE was *doing* rather than where the deal *stood*, and it overlapped Quoted almost entirely. Its removal eliminates the filing ambiguity flagged in ADR-0024 and the flow question Q20 along with it.

## Consequences

- **`delivery_status` is removed from the domain model** before it was ever built.
- The gap between Won and Completed can be months. Any report that says "revenue" must state whether it means booked or delivered — this is now a real reporting distinction, not a technicality.
- Deals sit in Won for a long time. Stale-deal detection ([ADR-0008](0008-fixed-reports-over-report-builder.md)) must exclude Won and Completed, or every delivered job will show as neglected.
- Two date fields become worth capturing at close: **PO date / number** when entering Won, and **delivery completion date** when entering Completed. These are the basis of any future delivery-cycle analysis.
- **Granularity within delivery is gone.** If VCS later needs to see "shipped but not commissioned", the right move is a sub-status on Won — one mechanism extended, not a second one added.
- Win rate is computed on Won + Completed against Rejected + Dropped. Completed must never be double-counted as a separate win.

## Revisit when

Deals routinely sit in Won long enough that the lack of delivery detail becomes a real problem, or after three months of use if the ladder does not describe how deals actually move.
