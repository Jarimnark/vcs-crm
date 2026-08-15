# ADR-0001: Build for the sales engineer first, management second

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept

## Context

VCS CRM has two clearly stated audiences: sales engineers now, and the CEO/management next year. Both are legitimate. The question is which one the first release optimises for, because the two pull the product in opposite directions.

Management value comes from *complete, structured, current data*. The natural way to get that is to require fields, enforce process, and add validation. Every one of those makes the tool slower for the person doing data entry.

SE value comes from *speed and usefulness in their own daily work*. The natural way to get that is fewer fields, more defaults, and tolerance for incomplete records.

VCS today has no CRM at all. Adoption is not assumed — it has to be won.

## Options considered

1. **Management-first** — build the dashboard and reporting model, then require SEs to feed it.
   - Pro: the business case is visible immediately; sponsor sees value fast.
   - Con: SEs experience the tool purely as overhead. Classic failure mode of internal CRMs: data entry becomes a compliance chore, quality degrades, and the dashboard becomes confidently wrong.

2. **SE-first** — build the tool the SE would choose to use, and derive management reporting from the data it naturally produces.
   - Pro: adoption is voluntary rather than mandated; data stays current because keeping it current serves the person entering it.
   - Con: management value arrives later; requires trusting that good SE data will roll up well.

3. **Both at once** — full scope in one release.
   - Pro: nobody waits.
   - Con: with a small team and no existing system, this is the surest route to shipping nothing. Also removes the chance to learn from real usage before committing to a reporting model.

## Decision

Build for the sales engineer first. Phase 1 ships only what makes an SE faster at their own job. Management reporting in Phase 1 is limited to what falls out of that data for free — pipeline, forecast, activity, win/loss.

A design rule follows from this and applies to every future feature: **every field we ask an SE to fill must earn its place by helping the SE.** If a field exists only to feed a manager's report, it needs an explicit justification recorded here.

## Rationale

The failure mode of internal CRMs is not "wrong features" — it is "abandoned". At under 10 users, there is no ops team to enforce hygiene and no way to compel use. The only durable mechanism is that the tool is genuinely better than the spreadsheet it replaces.

Management reporting is also strictly downstream: it can be built on maintained data, but maintained data cannot be built on management reporting. The dependency runs one way, so the build order follows it.

## Consequences

- The CEO waits until Phase 3. This is a deliberate, communicated trade — not an oversight.
- "My Day" (the SE's landing page) is the first screen built, not the pipeline dashboard.
- We accept that Phase 1 reports will be somewhat basic.
- We accept some data incompleteness in Phase 1 in exchange for speed of entry. Fields become mandatory only where the SE's own work depends on them, plus the two exceptions below.
- Two management-serving fields are accepted into Phase 1 anyway because their cost is trivial and their value is unrecoverable if not captured at the moment: **stage-change reason** and **win/loss reason**. Both are only asked at a moment the SE is already thinking about them.

## Revisit when

Phase 1 has been in sustained daily use for a month and adoption metrics are met. At that point the constraint changes and management-serving features can be added without risking the adoption base.
