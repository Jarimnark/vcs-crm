# ADR-0046: Client answers resolve the quotation and project-model questions

- **Status:** Accepted
- **Date:** 2026-08-22
- **Deciders:** KK (relaying client confirmation)
- **Phase:** Domain model / Product
- **Resolves:** B2, B3, B4, B6, B7, B8, B9, B10, B11 ([`00-product-concept.md`](../00-product-concept.md) §10) and approves the CONTEXT.md K1–K8 plan
- **Amends:** [ADR-0031](0031-quotation-template-and-numbering.md) (page 2), [ADR-0028](0028-progress-and-status-are-independent.md) (interaction confirmed manual)

## Context

The open questions that blocked the quotation builder and parts of the
project model were answered by KK on 2026-08-22. This record captures each
answer verbatim in intent, and what it changes.

## Decisions

### B2 — There IS a page 2: terms & conditions move there

The quotation gains a **terms & conditions page** after the line/totals
pages. The T&C wording is company-level content (maintained in company
settings, printed identically on every quotation), not per-quotation text.

- Template: the terms *block* (currency, Incoterm, lead time, payment,
  origin — per-quotation values) stays with the totals on the last line
  page, per [ADR-0031](0031-quotation-template-and-numbering.md). The
  standard **T&C section renders on its own final page**.
- **New open item T1: the actual T&C wording from VCS.** Until it arrives,
  the page renders only when the company T&C field is non-empty — so the
  current samples (no T&C) remain reproducible.

### B3 — Discount: enter either amount or percent; the system derives the other

The builder accepts input in either form and immediately computes and
displays the counterpart (via `decimal.js`, half-up). Both are kept in sync;
the entered form is recorded as authoritative (`discount_type` stays, so
re-deriving after a price change follows the user's intent: a percent
discount re-derives the amount, an amount discount re-derives the percent).
The printed column shows the amount, `-` when none, matching the samples.

### B4 — Revision numbering: suffix confirmed (`QUO69054-R2`)

As recommended. Already implemented in the PDF context.

### B6 — Terms are per quotation (header-level), confirmed

No per-line terms. Consistent with B2: per-quotation terms print once in the
terms block; standard T&C print on the final page.

### B7 — Status is set by hand

No automatic Won at 90/100. Progress and status stay fully independent
([ADR-0028](0028-progress-and-status-are-independent.md)); the UI never
couples them.

### B8 — No labels on progress steps

Progress displays as plain percentages (10–100). The inferred label ladder
is dropped from the UI. (Internal history still records the numeric value.)

### B9 — No lost-reason codes

The `lost_reason` picklist kind is dropped. Lost reason remains a **required
free-text field** when a project is set Lost (the client spec's requirement
stands; only the code list is gone). Lost-at-stage reporting is unaffected —
it reads frozen progress, not the reason.

### B10 — Progress 100 for consumables is set manually

"Repeat ordering established" is a human judgement. Won (90) is set by hand
too (B7). The system prompts for the follow-up interval at Won but never
moves progress on its own.

### B11 — A quotation never mixes cost currencies

Confirmed. The header-level FX rate
([ADR-0040](0040-fx-rate-at-quotation-level.md)) stands with no per-line
escape hatch needed.

### B5 — still open, with the reasoning restated

KK asked why a seeded counter is needed rather than year-based numbering.
Answer: the numbering format is the client's, not ours to choose. The live
samples are `QUO69041` and `QUO69054` — **one continuous global sequence
with no year component and no annual reset**, already in the high 69000s and
recognised by VCS's customers on their own paperwork
([ADR-0031](0031-quotation-template-and-numbering.md)). A year-based scheme
(`QUO2026-####`) would change the number format customers use to reference
orders, and restarting from 1 would collide with documents already sent.
The counter seed is simply *the last number VCS has used*, so the system
continues 69055, 69056, … seamlessly. **Still needed from VCS: that current
number.** (If VCS actually wants to switch to year-based numbering going
forward, that is a client decision to confirm explicitly — it contradicts
their own samples, so it must not be assumed.)

### Plan approval (K1–K8)

KK approved: K1 account multi-select types · K2 full schema alignment ·
K3 spec-correct reorder loop (per-project interval, prompt at Won,
complete-one-schedules-next, pause; drop the hard-coded 90-day logic) ·
K5 spec role values · **K6 build the quotation builder now** (B3 answered;
numbering continues on the placeholder seed until B5's value arrives) ·
K7 F1–F8 defaults · K8 N2 all-see-all, N3 account-level hours, N4
assign-to-anyone.

K4 (restore `02-data-model.md` / `04-infrastructure.md`) is pending KK
checking whether the files exist outside the repo; if not,
`02-data-model.md` will be rewritten from the confirmed schema and become
canonical.

## Consequences

- The quotation builder is unblocked except for cosmetics that depend on
  **B1** (multi-line sample) and the **T1** T&C wording.
- Schema: `discount_type`/`discount_value` stay; `lost_reason` picklist kind
  is removed from seeds; progress-label map is removed from the UI; company
  settings gain a T&C field; template gains a conditional T&C page.
- **Outstanding from the client: B1 (multi-line sample), B5 (current counter
  value), T1 (T&C wording).** None block build; B5 blocks launch seeding.

## Revisit when

B1 arrives (may change row spacing/page-break details), or VCS states a
deliberate wish to change their numbering format.
