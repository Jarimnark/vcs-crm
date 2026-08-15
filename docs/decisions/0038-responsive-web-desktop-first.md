# ADR-0038: Responsive web, desktop-first, mobile usable

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Product / Technology
- **Resolves:** Open question N1 (client C7 / Q6)

## Context

The client left the platform question open (their C7 and Q6): web only, or is mobile access needed for logging meetings in the field? Their own note said responsive web is "almost certainly the right answer at this size" but asked for confirmation.

The question mattered because the two halves of this product pull in opposite directions. The quotation builder needs screen space — a line table with cost, price, discount, margin, components, and a live grand total is a desktop layout. Logging a meeting happens after a client visit, when the engineer is in a car park or a lobby with a phone.

KK confirmed: **responsive web, desktop-first, mobile usable.**

## Options considered

1. **Desktop web only.**
   - Pro: smallest build; no responsive work on complex screens.
   - Con: meeting notes get written back at the office, hours or days later, when detail has already been lost. Outcome notes are the main reason to log a meeting at all, so their quality is the feature.
2. **Responsive web, desktop-first** — chosen.
   - Pro: one codebase, one deployment, no app store. Desktop gets full fidelity where it is needed; the handful of field-critical paths get real mobile attention.
   - Con: the quotation builder will be poor on a phone. Accepted — nobody builds a quotation standing in a factory.
3. **Native or PWA mobile app alongside a web app.**
   - Pro: best field experience, offline capable.
   - Con: two codebases and a distribution story, for five users. The client's C8 already recommends against offline as disproportionately expensive, and a 1 GB droplet plus a 5,000 THB/year budget rules out the API layer and sync infrastructure an app would want.

## Decision

**Responsive web. One Django application, server-rendered ([ADR-0035](0035-tech-stack-django-weasyprint.md)). No native app, no PWA, no offline.**

**Desktop-first screens** — full fidelity, phone layout not a priority:

- Quotation builder and PDF preview
- Reports
- Admin, picklists, company settings
- Account and project list views with many columns

**Mobile-real screens** — designed for a phone and tested on one:

| Screen | Why it must work on a phone |
|---|---|
| **My Tasks** | The daily check. Opened between other things |
| **Log a meeting** | Immediately after a client visit, while detail is fresh |
| **Complete a task** | One tap, from anywhere |
| **Project detail, read-only** | Looking up a price or a contact in front of a customer |
| **Search** | Same |

**Explicitly not mobile:** building or editing a quotation, running reports, admin.

Mobile targets: single-column layout, tap targets ≥ 44 px, no horizontal scrolling, and **the meeting form completable in under two minutes on a phone**.

## Rationale

The decision follows from where the *value* of each screen sits rather than from a general principle about responsiveness. A quotation is a considered document built at a desk; compressing that table onto a phone would produce a screen nobody uses and cost real effort. A meeting note is perishable — its value decays sharply within hours, because the specific thing the customer said is exactly what gets forgotten. So mobile matters precisely and only where timing affects data quality.

Rejecting offline is worth stating separately, because it is the one place where "responsive web" is genuinely weaker than an app. The client's C8 recommends against it and that is right at this budget: offline means local storage, a sync protocol, and conflict resolution — a substantial subsystem. The mitigation is smaller: forms that **retain their content on a failed submit and can be retried**, rather than losing what was typed. That covers the realistic failure (a dropped connection in a factory car park) without building sync.

This also settles a question left hanging by [ADR-0033](0033-expenses-deferred-to-phase-2.md). Expense capture was deferred partly *because* mobile was unconfirmed — capture only works from a phone with the receipt in hand. Mobile is now confirmed, so when Phase 2 revisits expenses, the platform is no longer a blocker; only receipt storage is ([ADR-0036](0036-infrastructure-single-droplet.md)).

## Consequences

- No API layer, no SPA, no build pipeline — consistent with [ADR-0035](0035-tech-stack-django-weasyprint.md) and with keeping the unfamiliar surface small ([ADR-0037](0037-maintainer-capability-as-a-constraint.md)).
- CSS must be responsive from the first screen, not retrofitted. A mobile-last approach on a server-rendered app tends to produce a second set of templates.
- **The five mobile-real screens get tested on an actual phone**, not a browser at narrow width. The difference shows up in tap accuracy and keyboard behaviour.
- Photo upload from a phone camera works through a standard file input — no native integration needed. Resize on upload ([`04-infrastructure.md`](../04-infrastructure.md)).
- Forms retain content on failed submit. Cheap, and it covers the real connectivity failure.
- Session length should tolerate a phone being pocketed mid-task — 12 hours ([`04-infrastructure.md`](../04-infrastructure.md)) is comfortable.
- One knock-on for Phase 2: **the platform objection to expense capture is gone.** Only receipt storage remains.

## Revisit when

Field use shows connectivity is genuinely blocking — at which point a retry queue for the meeting form is the next step, not an app. Or if the team grows enough that a real mobile workflow beyond these five screens emerges.
