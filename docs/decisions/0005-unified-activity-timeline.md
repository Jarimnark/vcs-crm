# ADR-0005: Tasks, meetings, visits and notes share one Activity model

- **Status:** ⚠️ Partially superseded — see [ADR-0027](0027-adopt-client-phase-1-specification.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model

> **Partially superseded 2026-08-11.** The client models **Task and Meeting as separate entities** with materially different fields — Meeting has duration, mode, and a many-to-many attendee list; Task has recurrence and an auto-generated flag. The client's split is adopted. The read-pattern argument below still applies to the **project timeline view**, which must now union two tables — an accepted cost, and a smaller one than it was, since these two have diverged more than the original four subtypes had.

## Context

The product needs tasks, meetings, site visits, and free notes. Each has slightly different fields — a task has a due date and a done flag; a meeting has a start time, duration, and attendees; a visit has a location and usually leads to a technical document; a note has only text.

Two of the most valuable screens in the product depend on reading across all of them: the **opportunity timeline** ("what has happened on this deal?") and **My Day** ("what needs my attention?"). Both are ADR-0001 features — they serve the SE directly.

## Options considered

1. **Separate entities per type** — `Task`, `Meeting`, `Visit`, `Note`, each its own table.
   - Pro: clean, precisely typed schemas; no unused columns.
   - Con: every timeline query becomes a four-way union with manual sorting and pagination. Adding a fifth type (call log, email) means touching every timeline and every report. Activity-count reporting requires summing across tables.

2. **One `Activity` entity with a `type` discriminator** and the union of fields, most nullable.
   - Pro: timeline and My Day are single, simple, indexable queries. New activity types are a new enum value. Activity reporting is one aggregate.
   - Con: sparse table with many nullable columns; type-specific validation lives in application code rather than the schema.

3. **Shared base + per-type detail tables** (class-table inheritance).
   - Pro: clean typing *and* a single timeline query on the base table.
   - Con: every read joins; every write is a transaction across two tables. Real complexity for a system with four types and under 10 users.

## Decision

One `Activity` entity with a `type` discriminator (`TASK` | `MEETING` | `VISIT` | `NOTE`), a shared core (subject, body, owner, related account, related opportunity, timestamps), and type-specific nullable fields. Type-specific required-field validation is enforced in the application layer.

`Document` stays a separate entity (per [ADR-0010](0010-document-model.md), which superseded ADR-0002) but appears *on* the timeline alongside activities. So does `Expense` ([ADR-0011](0011-sales-allowance-is-expense-capture.md)), which hangs off an activity rather than being one.

## Rationale

The read patterns dominate. Timeline and My Day are the screens SEs look at most, and both want "everything related to X, ordered by time". Option 1 makes the product's two most important queries the most awkward ones in the system, which is the wrong trade.

Option 3 is the textbook-correct answer and the wrong one at this scale — it buys schema purity at the cost of join complexity on every single read, for a system with four subtypes and a handful of users.

The main objection to option 2 is validation moving out of the schema. At this size that is an acceptable cost, and it is contained if type rules live in one clearly-named place rather than scattered through controllers.

## Consequences

- Timeline, My Day, and activity reporting are simple, single-table queries. Index on `(related_opportunity, occurred_at)` and `(owner, due_at)`.
- Adding a new activity type (call log, email capture in Phase 2) is cheap.
- The table will have nullable columns that only apply to some types. This is a known and accepted cost.
- Type validation rules must live in one well-named module, not scattered. If that discipline slips, this decision gets expensive.
- UI must render each type distinctly even though they share storage — a visit should not look like a note.

## Revisit when

A fifth or sixth activity type arrives with substantially different fields, or the nullable-column count becomes genuinely unwieldy. Also revisit if activity volume ever reaches a scale where table width affects query performance — very unlikely at VCS's size.
