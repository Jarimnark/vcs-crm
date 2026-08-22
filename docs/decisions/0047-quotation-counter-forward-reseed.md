# ADR-0047: Quotation counter — seeded once, forward-only manual re-seed

- **Status:** Accepted
- **Date:** 2026-08-22
- **Deciders:** KK
- **Phase:** Domain model / Implementation
- **Extends:** [ADR-0031](0031-quotation-template-and-numbering.md), [ADR-0046](0046-client-answers-quotation-and-project-model.md) (B5)

## Context

KK asked two follow-ups on B5: *why a seeded counter rather than deriving
numbers from the creation year* — and *if the counter is seeded by number,
how does VCS start at 700XX next year if they want to?*

The samples (`QUO69041`, `QUO69054`) show the number is **not year-coded**:
it is one continuous sequence VCS has been incrementing for years, and 69xxx
in 2026 carries no year meaning. So the year cannot generate the number —
only the previous number can.

## Decision

1. **The counter is one integer** — `company.quotation_number_next`
   ([`02-data-model.md`](../02-data-model.md) §3.1, §6.5) — **seeded once**
   from VCS's real current value before launch (B5, still awaited).
2. **Jumping forward is a supported admin action.** If VCS wants next
   year's quotations to start at 70001 (or any round number), an admin sets
   the next number on the company-settings screen. The system validates
   **forward-only**: the new value must be greater than the current one.
   Gaps in the sequence are safe; going backwards would mint duplicates of
   numbers customers already hold, so it is refused.
3. **No automatic yearly reset or year prefix.** The samples show none. If
   VCS ever wants a genuinely year-coded format (e.g. `QUO2027-0001`), that
   is a format change for the client to request explicitly — not something
   the system infers.

So "we want 700XX next year" is one admin edit each January, and nothing
more.

## Consequences

- The company admin screen gains a **"next quotation number"** field with
  forward-only validation (Phase A/B work).
- Allocation happens **at issue, not draft creation**
  ([`02-data-model.md`](../02-data-model.md) §6.5) — a deleted draft
  consumes nothing. The current scaffold allocates a separate
  `quotation_counter` row; Phase A moves this onto `company` per the data
  model and fixes the allocation point.

## Revisit when

VCS states a wish to change the number format itself (year-coded), or B5's
real value arrives for seeding.
