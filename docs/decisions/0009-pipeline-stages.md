# ADR-0009: Six sales stages, with delivery tracked separately

- **Status:** ⚠️ Superseded by [ADR-0024](0024-revised-pipeline-stages.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Domain model

> **Further superseded 2026-08-11.** The whole named-ladder lineage (0009 → 0024 → 0025) is replaced by **Progress % + Status as two independent fields** — see [ADR-0028](0028-progress-and-status-are-independent.md). Delivery is no longer a separate concern: project *type* determines what 90/100 mean ([ADR-0029](0029-project-types-and-repeat-orders.md)).

> **Superseded 2026-07-29.** This ladder was designed by analogy, on the basis that the team would adapt to it. KK subsequently supplied VCS's own stages, which [ADR-0024](0024-revised-pipeline-stages.md) adopts. Two parts of this record survive: **delivery stays a separate field** rather than a pipeline stage (the reasoning below is the reason why), and **`Dropped` is distinct from `Rejected`**. The rest — including the Site Survey stage — is replaced.

## Context

The pipeline stage ladder is the backbone of the CRM: it drives the board layout, the forecast, the "what should I do next" prompts, and every management report. It has to match how VCS actually sells.

Asked to confirm the real stages, KK's answer was: *"we can design for them. Since there is a small group of team, they can adapt."* So this is a designed ladder rather than an observed one — the team will adopt it, not the other way round. That is workable at under 10 users, but it makes the design choice ours to justify.

A second question sits underneath: industrial equipment deals do not end at the purchase order. Delivery and commissioning take weeks or months, and the SE stays involved throughout — producing test and service reports. Does that belong in the pipeline?

## Options considered

**Stage count**

1. **Four stages** (Enquiry → Quotation → Negotiation → Won/Lost) — fastest to adopt, but collapses all pre-quote engineering work into "Enquiry". We would lose the ability to see how much SE effort goes into deals before a quote exists, which is precisely the thing ADR-0002/0010 makes visible.
2. **Six stages** with site survey and qualification split out — more granular without being bureaucratic. Each stage boundary corresponds to a real event an SE can point at.
3. **Seven or more**, adding delivery and commissioning — matches the full job lifecycle, but see below.

**Where delivery goes**

1. **As late pipeline stages** — "Won" is followed by "Delivered", "Commissioned".
   - Con: breaks the forecast. A pipeline stage carries a win probability; a delivery step does not. Mixing them means either the forecast double-counts won deals or the stage field carries two incompatible meanings. It also makes the pipeline board unreadable — months of delivery work clogging the right-hand columns.
2. **A separate `delivery_status` field on won opportunities.**
   - Pro: sales stage stays terminal at Won/Lost/Dropped, so the forecast is clean. Delivery gets its own simple lifecycle and its own view.
   - Con: two status fields on one record; needs clear UI so nobody confuses them.

## Decision

**Sales stages — six, terminal at close:**

| # | Stage | Means | Default probability |
|---|---|---|---|
| 1 | Enquiry | Request received, not yet assessed | 10% |
| 2 | Qualified | Real need and budget confirmed; worth SE time | 20% |
| 3 | Site Survey / Technical Study | SE engaged — visiting, measuring, spec'ing | 35% |
| 4 | Proposal & Quotation | Priced proposal sent; awaiting customer response | 50% |
| 5 | Negotiation | Price, terms, or scope actively being agreed | 75% |
| 6 | Won / Lost / Dropped | Closed | 100% / 0% / 0% |

*Lost* = customer chose otherwise or said no. *Dropped* = went cold, was cancelled, or VCS declined to pursue. Both are closed; separating them keeps the win-rate honest.

**Delivery — a separate field**, set only on Won opportunities: `Not started → In delivery → Commissioned → Closed`.

Stages are stored as configurable data, not hard-coded, so the manager can rename or reorder them without a release.

## Rationale

Six stages is the point where each boundary is an event an SE can name without ambiguity — *did we visit? did we send the quote? are they haggling?* Fewer than that and the board tells you nothing about where effort is going. More and SEs start guessing, which produces worse data than a coarser ladder.

Stage 3 exists specifically because site survey work is the most expensive thing an SE does before there is any commitment. Making it a visible stage lets us later answer "does doing a survey actually raise our win rate, and by how much?" — a question that justifies or kills a lot of travel.

Keeping delivery out of the pipeline protects the forecast, which is the pipeline's main output. A won deal has no probability; putting it back on the board as an open column corrupts every forecast number downstream.

The probabilities above are guesses. They are starting values, not findings.

## Consequences

- Stage configuration is an admin screen (Manager role, per ADR-0006), not a code constant.
- Every stage change records who, when, and why (per ADR-0001) — this is what makes stage-duration and conversion analysis possible later.
- The forecast is `Σ (opportunity value × stage probability)` over open opportunities only.
- Probabilities must be recalibrated against actual conversion rates once roughly a year of closed deals exists. Until then, treat the weighted forecast as directional.
- Because the ladder is designed rather than observed, it needs a deliberate check-in after ~3 months of use: are deals sitting in a stage that doesn't describe them? Is anyone skipping a stage every time? Either is a signal the ladder is wrong.
- Delivery status and sales stage must be visually distinct in the UI, or they will be confused.

## Revisit when

Three months of real use, or sooner if SEs are routinely skipping a stage or arguing about which stage a deal is in. Recalibrate probabilities at one year of closed-deal data.
