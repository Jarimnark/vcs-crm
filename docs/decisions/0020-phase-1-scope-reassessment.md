# ADR-0020: Phase 1 roughly doubled — internal milestones, and what gets cut if it must shrink

- **Status:** ⏸️ Parked — KK: phasing is a PM concern, to be confirmed after product design
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept
- **Refines build order in:** [ADR-0001](0001-build-for-the-sales-engineer-first.md)

> **Parked 2026-07-29.** KK: *"this is part of PM, let's focus on product first. The product's phase will be confirmed later."*
>
> The milestones and cut list below are **not committed**. Product design continues across the full scope without regard to release boundaries, and phasing is decided later.
>
> Two things in this record remain useful regardless of when anything ships, and should be read even while it is parked:
>
> - **The foundational/deferrable distinction.** Multi-currency, bilingual data, the `Money` value type, and expense visibility touch every entity and cannot be retrofitted cheaply. Whatever the eventual phasing, these belong in the first thing built.
> - **The scope observation itself.** Phase 1 doubled through a series of individually correct decisions. That will happen again; the record exists so it is noticed rather than absorbed.
>
> Phase labels elsewhere in the documentation should now be read as **groupings of intent, not schedule commitments**.

## Context

Between v0.2 and v0.3 of the product concept, Phase 1 took on four significant additions and shed one:

| Change | Effect on Phase 1 |
|---|---|
| Quotation promoted from Phase 2 ([ADR-0012](0012-quotation-is-phase-1-core.md)) | **Large increase** — revisions, VAT, terms, PDF |
| Product catalogue added ([ADR-0014](0014-product-catalogue-in-phase-1.md)) | Moderate increase — plus import tooling |
| Multi-currency ([ADR-0015](0015-multi-currency.md)) | Moderate increase — touches every money field |
| Bilingual ([ADR-0016](0016-bilingual-thai-english.md)) | Moderate increase — i18n plus Thai PDF rendering |
| Templated document authoring removed ([ADR-0013](0013-documents-are-collected-not-authored.md)) | **Large decrease** |

Net: Phase 1 is roughly **twice** the scope it was in v0.2. Every individual decision above is sound and follows from a real requirement. The aggregate still deserves a look, because "Phase 1" has quietly stopped meaning "the smallest thing worth using".

Three of the additions are also *foundational* rather than additive — multi-currency, bilingual, and the money value type touch nearly every entity and are painful to retrofit. They cannot be deferred the way a feature can.

## Options considered

1. **Accept the larger Phase 1 as one release.**
   - Pro: launches complete and coherent; nothing half-built.
   - Con: a long stretch with nothing in users' hands, and no feedback until the end. For a first internal system with an unproven ladder ([ADR-0009](0009-pipeline-stages.md)) and designed-not-observed stages, that is a lot of unvalidated work.
2. **Split into Phase 1a and 1b as separate releases.**
   - Pro: something ships sooner.
   - Con: an arbitrary line invites re-negotiating the phase boundaries that [ADR-0003](0003-phase-boundaries.md) exists to protect.
3. **Keep one Phase 1, sequence it internally into milestones**, with a pre-agreed cut list if it runs long.
   - Pro: preserves the phase model; creates natural checkpoints where real users can see something; makes the trade-offs explicit *before* schedule pressure arrives rather than during it.
   - Con: milestones are not releases, so the feedback is informal.

## Decision

Option 3.

### Internal milestones

**M1 — Foundation and quotation.** Auth and roles; accounts, contacts, principals; product catalogue with import; opportunities with stages and line items; multi-currency value type; i18n framework; **quotation with revisions and bilingual PDF**.

*Exit test: an SE can run a real deal end to end and send a real quotation from the system.*

**M2 — Daily rhythm.** My Day; tasks; meetings and visits; document collection; expense capture with visibility restriction; mobile paths.

*Exit test: an SE would open it on a Monday morning without being asked to.*

**M3 — Reporting and close.** The five built-in reports; delivery status; usage instrumentation for the [ADR-0003](0003-phase-boundaries.md) adoption gate; Tier-2 historical import.

### Build-order refinement to ADR-0001

[ADR-0001](0001-build-for-the-sales-engineer-first.md) said build "My Day" first, as the habit-forming screen. That was right when quotation was in Phase 2. It is now wrong in detail while remaining right in principle.

My Day is a *habit* screen — it shows things that already exist, so on an empty system it shows nothing. Quotation is the *adoption* feature: it gives the SE more than it asks of them from the very first use, which is exactly what [ADR-0001](0001-build-for-the-sales-engineer-first.md) was reaching for. Building it first also forces the foundational pieces — products, line items, currency, i18n — to be right early, when they are cheap to change.

The principle is unchanged: build what the SE would choose to use. The order changes because the strongest instance of that principle changed.

### Pre-agreed cut list

If M1 or M2 runs long, cut in this order — decided now, while nobody is under pressure:

| Order | Cut | Why it is safe |
|---|---|---|
| 1 | Three of the five reports — keep only **Pipeline by stage** and **Stale opportunities** | Reports are read weekly, not daily. Non-adoption-critical. |
| 2 | **Delivery status** on won deals | Post-sale tracking; not needed to win work |
| 3 | **Meetings** as distinct from visits — merge into one activity type | Reduces UI surface; the distinction can be a field |
| 4 | **Tier-2 historical import** (past deals) | Tier 1 — the catalogue — must stay; history can arrive later |
| 5 | Quotation **revision chain** — single version per quotation at first | Painful, and the *last* resort: re-issuing quotes is normal in this business |

**Never cut:** multi-currency, bilingual data fields, the money value type, or expense visibility. The first three are retrofits that would touch every table; the fourth is a trust commitment ([ADR-0017](0017-expense-visibility-restriction.md)) that cannot be walked back once broken.

## Rationale

The point of writing this down is that scope grew through a series of individually correct decisions, which is the way it usually grows. Nobody makes the decision to double a release; it accumulates. Recording the aggregate makes it a choice rather than a surprise.

Deciding the cut list in advance is the part that earns its keep. Cuts made under schedule pressure are made badly — they fall on whatever is least finished rather than whatever is least important, and foundational work gets sacrificed precisely because it is invisible. Ranking them now, with reasons, means a later decision is a lookup rather than an argument.

The distinction between deferrable features and foundational ones is the sharpest tool here. Reports can arrive a month late at almost no cost. Multi-currency arriving a month late means migrating every monetary column in a live system.

## Consequences

- M1 is the longest milestone and carries most of the technical risk — Thai PDF rendering, the money value type, and import tooling all land there.
- Nothing is usable until M1 completes. This is accepted, but it means M1 should not be allowed to sprawl.
- Thai PDF output must be proven in the **first week** of M1, not the last ([ADR-0016](0016-bilingual-thai-english.md)). It is the most likely unpleasant surprise in the whole build.
- The adoption metrics in [ADR-0003](0003-phase-boundaries.md) cannot be measured until M3 ships the instrumentation, so the Phase 2 gate is effectively gated on M3.
- If more than two items come off the cut list, that is a signal Phase 1 was mis-scoped — the right response is to reconsider the phase, not to keep cutting.

## Revisit when

At the end of M1. Actual velocity there is the only real evidence about whether the rest is correctly sized.
