# ADR-0028: Progress % and Status are two independent fields

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** Client, via `adhesive-crm-user-stories.md` §2
- **Phase:** Domain model
- **Supersedes:** [ADR-0009](0009-pipeline-stages.md) → [ADR-0024](0024-revised-pipeline-stages.md) → [ADR-0025](0025-stage-ladder-with-won-and-completed.md)

## Context

This log went through three iterations of a single named stage ladder, ending at eight stages (Lead → Inquiry Received → Quoted → Negotiation → Won → Completed, plus Rejected and Dropped). Each iteration was an improvement, and all three shared a structural flaw the client specification exposes.

**A single stage field cannot express position and outcome at the same time.** Under [ADR-0025](0025-stage-ladder-with-won-and-completed.md), a deal lost during negotiation moves to `Rejected` — and the information that it died *at negotiation* is gone from the field. It survives only in `ProjectHistory`, recoverable by query but not by looking at the record. "What stage do we lose deals at?" — the single most actionable question in win/loss analysis — became a history-reconstruction exercise.

The client's model separates the two concerns:

| Field | Purpose | Values |
|---|---|---|
| **Progress %** | How far the project has advanced | 10, 20, 30 … 100, fixed steps |
| **Status** | Whether the project is still live | Open / Won / Lost |

A project lost during negotiation is `progress = 70, status = Lost`. Both facts are on the record.

## Options considered

1. **Keep the named ladder** ([ADR-0025](0025-stage-ladder-with-won-and-completed.md)).
   - Pro: named stages are more legible than percentages; "Negotiation" needs no lookup, "70%" does.
   - Con: cannot hold position and outcome together, which is the whole reason the client raised it. Also not the users' language.

2. **Named ladder plus a separate status field** — a hybrid.
   - Pro: keeps legibility, gains the separation.
   - Con: the client asked for percentages and their users already think in them. Inventing a parallel vocabulary for the same ladder is a translation layer nobody needs.

3. **The client's model** — progress percentage plus status.
   - Pro: separation of concerns; matches user language; percentages weight the pipeline directly with no probability lookup table; fixed 10% steps keep it disciplined.
   - Con: "40%" carries less meaning than "Proposal confirmed" until someone learns the ladder. Mitigated by always displaying the label next to the number.

## Decision

Two independent fields, as specified by the client.

**Progress ladder** — labels for 40, 60, and 80 were inferred by the client's analyst and remain unconfirmed (their D13):

| % | Meaning |
|---|---|
| 10 | Lead received |
| 20 | Inquiry captured |
| 30 | Spec review — internal review, supplier request sent |
| 40 | Proposal / spec confirmed |
| 50 | Quoted — quotation issued to client |
| 60 | Client reviewing |
| 70 | Negotiation |
| 80 | Final terms agreed — verbal commitment, PO pending |
| 90 | Consumable: **Won** (first order confirmed). Others: PO imminent |
| 100 | Consumable: **repeat ordering established**. Others: **PO received** |

**Rules:**

- Progress is chosen from fixed 10% steps. No arbitrary values.
- **Progress may move backwards** — re-quoting can drop 70 → 50. This is expected, not an error.
- `status = Lost` **requires** a lost reason.
- Progress is **not reset or forced** when status changes to Lost. It freezes at the point of loss. That frozen value *is* the lost-at-stage data.
- Every change to either field writes a `ProjectHistory` row: field, from, to, user, timestamp.
- The UI always shows the label beside the percentage, never the bare number.

**Pipeline weighting uses progress directly** as the probability. No separate probability table — 40% progress means 40% weight. Open projects only.

## Rationale

The separation is the decision, and it is right for a reason worth stating plainly: **status is about whether the project is still alive, progress is about how far it got.** Those are genuinely different facts, and every version of the single-field ladder in this log conflated them and lost information at exactly the moment the information became most valuable — the loss.

Percentages over names is the client's call and a defensible one. Progress-as-weight is a real side benefit: the earlier design needed a probability mapped onto each named stage ([ADR-0025](0025-stage-ladder-with-won-and-completed.md)), which is an extra configurable table and an extra thing to get wrong. Here the number is the weight.

Allowing backward movement matters more than it appears. Most CRMs make regression awkward, so users leave a dead deal sitting at an optimistic stage and the pipeline inflates. Making it explicitly normal — and logging it — turns a data-hygiene problem into a reportable signal: how often do deals regress, and from where?

## Consequences

- `ProjectHistory` is not optional. Without it, days-in-stage, lost-at-stage, and regression reporting are all impossible, and none can be reconstructed later.
- **Progress 90/100 means different things by project type** ([ADR-0029](0029-project-types-and-repeat-orders.md)). Reports must branch on type, and the UI must show type-appropriate labels. This is the least elegant part of the client's model and the most likely source of confusion.
- **The two fields are not fully independent at the top of the ladder**, and the spec does not say how they interact. Open questions, raised in `00-product-concept.md` §12:
  - Does `status` become `Won` automatically at progress 90 (consumable) or 100 (others), or does the user set it separately? Two fields that must be kept in agreement by hand will drift.
  - Can a project be `status = Won` at progress 60? Should it be prevented, or allowed and reported as an anomaly?
- Pipeline value = `Σ (expected_amount × progress ÷ 100)` over projects with `status = Open`.
- Won and Lost projects leave the forecast immediately, regardless of progress.
- The 10-step ladder should be **configurable data, not constants** — three of the ten labels are still unconfirmed.

## Revisit when

The client confirms labels for 40, 60, and 80, and answers how status and progress interact at 90/100.
