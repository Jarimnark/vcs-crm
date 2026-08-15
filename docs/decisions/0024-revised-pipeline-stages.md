# ADR-0024: Revised pipeline stages — VCS's own ladder

- **Status:** ⚠️ Superseded by [ADR-0025](0025-stage-ladder-with-won-and-completed.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Domain model
- **Supersedes:** [ADR-0009](0009-pipeline-stages.md)

> **Superseded 2026-07-29.** Both ambiguities this record flagged were answered, and both changed the ladder: **"Completed" means job delivered**, so a separate **Won** stage was added; and **Follow-up was removed**. Delivery therefore moved into the ladder, which made `delivery_status` redundant. See [ADR-0025](0025-stage-ladder-with-won-and-completed.md). The wording rationale below still applies.

## Context

[ADR-0009](0009-pipeline-stages.md) proposed a six-stage ladder designed by analogy with how equipment businesses generally sell, on the basis that KK would have the team adapt to it.

KK has now supplied VCS's own stages: *lead, get-inquiry, quoted, follow up, negotiate, completed, rejected* — with a request to correct the wording, and a note that **the flow itself is still to be confirmed.**

This is better input than the designed ladder, because it reflects the language the team already uses. Two structural differences from ADR-0009 are worth noticing rather than smoothing over: there is no qualification stage, no site-survey stage, and a new "follow up" stage sits between quoting and negotiating.

## Options considered

Wording only — the stage set is KK's. Two questions arose while transcribing it.

**"Follow up" as a stage.** Every stage involves following up; it describes an *activity*, not a level of customer commitment. A stage ladder normally measures how close the deal is to closing, and by that test "Follow-up" and "Quoted" are the same position with different amounts of chasing.

- **Keep it.** It reflects a real, distinct situation the team recognises — the quote has gone out and nobody has responded — which is operationally different from a quote that has landed and is being discussed.
- **Merge into Quoted.** Cleaner in theory; discards a distinction the team apparently finds useful, and this ladder's value is that it is theirs.

Kept, with the ambiguity noted below.

**Closed outcomes.** KK's list has `rejected` but Q8 confirmed that separating *lost* from *dropped* is useful. `Rejected` alone cannot express "went cold" or "we withdrew". A third closed outcome is added.

## Decision

| # | Stage | Means | Default probability |
|---|---|---|---|
| 1 | **Lead** | Potential customer identified. No request from them yet. | 5% |
| 2 | **Inquiry Received** | The customer has asked for something specific. | 15% |
| 3 | **Quoted** | Quotation issued and sent. | 40% |
| 4 | **Follow-up** | Chasing a response to the quotation. | 50% |
| 5 | **Negotiation** | Price, terms, or scope actively being agreed. | 75% |
| 6 | **Completed** | Order won. | 100% |
| 7 | **Rejected** | Customer declined or chose a competitor. | 0% |
| 8 | **Dropped** | Went cold, was cancelled, or VCS withdrew. | 0% |

**Wording changes from KK's list:** `get-inquiry` → **Inquiry Received** (reads as a state, not an instruction — every other stage does too); `follow up` → **Follow-up**; `negotiate` → **Negotiation** (noun, consistent with the rest). `Dropped` added as an eighth stage.

**Delivery remains a separate field** on completed deals, unchanged from [ADR-0009](0009-pipeline-stages.md): `Not started → In delivery → Commissioned → Closed`.

**Stages remain configurable data**, so the flow can change without a release — which matters, since KK has flagged the flow as not yet final.

Probabilities are starting guesses, not findings, and are recalibrated against real conversion data once roughly a year of closed deals exists.

## Rationale

Adopting the team's own vocabulary matters more than ladder elegance. A stage called "Inquiry Received" that everyone already says beats a better-theorised "Qualified" that nobody uses — SEs will file deals correctly under words they recognise, and mis-filed deals corrupt every report downstream.

The wording corrections are deliberately minimal: make each stage read as a *state the deal is in*, and keep the parts of speech consistent. "Get-inquiry" reads as something you do; "Inquiry Received" reads as somewhere the deal is. That is the only real grammatical inconsistency in the list.

Adding `Dropped` is not a wording change but it follows directly from Q8. Without it, every deal that simply goes quiet has to be recorded as `Rejected`, which inflates the apparent loss rate and pollutes the win/loss reasons report — one of the five Phase 1 reports ([ADR-0008](0008-fixed-reports-over-report-builder.md)).

## Consequences

- **Site survey work is no longer visible as a stage.** [ADR-0009](0009-pipeline-stages.md) made it one specifically to measure whether surveys improve win rates. That measurement now has to come from activity and document records instead — still possible, less direct. Worth knowing the capability was traded away rather than overlooked.
- **There is no qualification step.** Leads move straight to Inquiry Received. If VCS spends effort on inquiries that were never real, nothing in the ladder will show it.
- **"Completed" is ambiguous** — it could mean *order won* or *job finished and commissioned*. This record assumes **order won**, consistent with delivery being tracked separately. If VCS means job-finished, the ladder needs a won-but-not-delivered stage and the forecast changes. **Needs confirmation.**
- **"Follow-up" and "Quoted" will be confused.** Two SEs will file the same situation differently. Either accept the noise, or define the boundary sharply — a suggestion: a deal moves to Follow-up only when the quotation's expected response date has passed.
- The forecast sums `value × probability` over stages 1–5 only. Stages 6–8 are closed.
- Because the flow is not final, avoid hard-coding stage names or counts anywhere — including in report queries.

## Revisit when

KK confirms the flow, or after roughly three months of use: if deals sit in stages that do not describe them, or if Quoted and Follow-up are used interchangeably, the ladder needs adjusting.
