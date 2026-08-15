# ADR-0003: Three phases, with Phase 3 gated on Phase 1 adoption

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept

## Context

The stated scope spans two quite different products: an SE productivity tool now, and a management/finance view "maybe next year". Without explicit boundaries, the second will leak into the first — management asks are always easy to justify individually and fatal in aggregate for a small build.

We also need a rule for *when* the next phase starts, otherwise the sequence is just a wish list ordered by preference.

## Options considered

1. **Two phases** — MVP, then everything else.
   - Pro: simple.
   - Con: lumps sales-operations depth (quotations, approvals, targets) together with executive finance reporting. These have different users, different risks, and different prerequisites.

2. **Three phases** — SE tool → sales operations → management & finance.
   - Pro: each phase has one primary user and a coherent theme; the middle phase is where the commercial process gets formalised, which is a genuine prerequisite for trustworthy finance numbers.
   - Con: more planning overhead; the CEO waits longer.

3. **Continuous delivery, no phases** — just a prioritised backlog.
   - Pro: flexible.
   - Con: with a small team and multiple stakeholders, "flexible" means the loudest stakeholder wins. Phases exist mainly to give a principled answer to "can you just add…".

## Decision

Three phases:

| Phase | Theme | Primary user |
|---|---|---|
| 1 | Daily SE tool | Sales engineer |
| 2 | Sales operations depth | SE + manager |
| 3 | Management & finance | CEO / management |

**Phase 2 does not begin until Phase 1 meets its adoption metrics** (see §10 of the product concept): sustained daily use by most of the team, >90% of live deals in the system, and >70% of opportunities updated within 14 days.

**Phase 3 is gated on the same evidence**, not on a calendar date. "Next year" is an expectation, not a commitment.

## Rationale

Phase 3 outputs — revenue against target, margin, allowance — are only as good as the pipeline data underneath them. Publishing an executive dashboard built on half-maintained data is worse than publishing nothing: it produces decisions made on wrong numbers, and once management catches the system being wrong, trust does not come back. The gate makes that dependency explicit and gives a non-political reason to say "not yet".

The middle phase exists because quotations, approvals, and targets are the mechanism by which the commercial process becomes uniform enough to report on. Skipping straight from Phase 1 to executive reporting would mean computing margin from data entered inconsistently.

## Consequences

- Requests for CEO-facing features before the gate are answered with "that's Phase 3, and here's the metric that unlocks it" rather than a negotiation.
- The adoption metrics in §10 become contractual, not decorative. They need to be measurable in the app itself, which means basic usage instrumentation is in Phase 1 scope.
- If Phase 1 adoption fails, the correct response is to fix Phase 1, not to proceed to Phase 2.
- We accept that a strong executive request could override this. If that happens, it gets recorded here as a superseding decision with its reasoning — not applied silently.

## Revisit when

Phase 1 has been live for one month and adoption data exists. Also revisit if a business event (audit, funding, restructure) creates a genuine hard requirement for executive reporting earlier.
