# ADR-0008: Fixed built-in reports instead of a report builder

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept

## Context

Reporting is a stated core requirement — "UI a needed report for sales". Commercial CRMs typically ship a report builder: pick an object, choose fields, add filters and groupings, save the view. It is the flexible answer, and it is a substantial piece of software.

VCS has fewer than 10 users and no existing CRM, so nobody yet knows which reports they will actually want.

## Options considered

1. **Generic report builder** — users compose their own reports.
   - Pro: any future need is self-served; no engineering request for each new report.
   - Con: a large build (query composition, aggregation UI, permissions, export, saved views). At this team size, in practice one person learns it and everyone else asks that person. It also defers the design work of figuring out what a *good* report looks like onto users who have never had reports before.

2. **Fixed, well-designed built-in reports** — a curated set, each purpose-built.
   - Pro: far less work; each report can be genuinely well designed for its question, with the right chart, the right defaults, and drill-through to the underlying records. Ships in Phase 1.
   - Con: a new report needs a developer. The set may not cover every need.

3. **Export to spreadsheet and let people build their own.**
   - Pro: trivial.
   - Con: recreates the manual Excel work the project exists to eliminate.

## Decision

Phase 1 ships a fixed set of built-in reports:

| Report | Question it answers | Primary user |
|---|---|---|
| Pipeline by stage | Where are the deals, and what are they worth? | SE + Manager |
| Forecast by close month | What is likely to land, weighted and unweighted? | Manager |
| Activity summary per SE | Visits, meetings, tasks, reports — who is doing what? | Manager |
| Win/loss with reasons | What are we winning and losing, and why? | Both |
| Stale opportunities | What has gone quiet and needs chasing? | SE |

Every report supports filtering by owner, date range, and principal, drill-through to the underlying records, and CSV export. CSV export is the escape hatch for a genuinely one-off analysis.

## Rationale

Nobody at VCS has had CRM reporting before, so nobody yet knows what they want. Building a flexible tool for unknown needs is the expensive way to find out; building five good reports and watching which ones get used is the cheap way. Usage data from Phase 1 is the requirements document for whatever comes next.

Purpose-built reports are also simply better than composed ones. A well-designed win/loss report with the right grouping, sensible defaults, and drill-through beats anything a user assembles from a field picker on their first try.

CSV export defuses the main objection: an unanticipated one-off question is still answerable without waiting for a release.

## Consequences

- New reports require a developer. At this team size and cadence, acceptable.
- Report definitions should be structured in code (a shared query/aggregation layer) so adding the sixth report is hours, not days.
- Instrument report usage — which reports are opened, by whom, how often. This directly informs the Phase 2 reporting decision.
- If the fixed set proves genuinely insufficient, the fallback is a small number of additional fixed reports, not an immediate pivot to a builder.

## Revisit when

Report requests exceed roughly one per month, or Phase 3 executive reporting begins — at which point a proper BI tool reading the database may be a better answer than building a builder.
