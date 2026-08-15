# ADR-0026: Remove `OpportunityLineItem` — the opportunity carries values, quotations carry lines

- **Status:** ⚠️ Superseded by [ADR-0030](0030-order-record-per-po.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Resolves:** Open question Q21

> **Superseded 2026-08-11.** Consumable projects now continue across repeat orders ([ADR-0029](0029-project-types-and-repeat-orders.md)), so a project's value stops being a single number and becomes a series. Replaced by `Project.expected_amount` plus an **Order** record per PO — see [ADR-0030](0030-order-record-per-po.md). **Two findings survive:** removing duplicated line items (line detail lives only on quotations), and the derived `quoted_value`, which [ADR-0030](0030-order-record-per-po.md) retains against the client spec because this record quantified the forecast error it prevents.

## Context

The concept modelled line items in two places: `OpportunityLineItem` on the deal, and `QuotationLineItem` on each quotation. This looked reasonable when quotation was a Phase 2 feature ([ADR-0010](0010-document-model.md)) — the opportunity needed *somewhere* to hold what was being sold. Once quotation moved into the core ([ADR-0012](0012-quotation-is-phase-1-core.md)), the two overlapped.

Designing the quotation builder ([01-user-flows §5](../01-user-flows.md#5-flow-c--build-and-issue-a-quotation)) made the overlap concrete. Walking one deal:

| Day | Event | Opportunity lines | Quotation lines |
|---|---|---|---|
| 1 | Inquiry; SE guesses | 2 × pump = ฿370,000 | — |
| 5 | Survey finds valves + installation needed | *unchanged* | — |
| 8 | Quotation R1 issued | *unchanged* | ฿600,944 |
| 20 | R2 issued after negotiation | *unchanged* | ฿560,000 |
| 30 | Won | *unchanged* | ฿560,000 |

From day 8 the opportunity contradicts itself: its **value** reads ฿600,944 while its own **lines** total ฿370,000. Nothing in the system knows which is right, and both are queryable.

The failure is not that someone forgot to update. It is that there is no moment when updating the opportunity lines is worth anyone's time — the SE is about to build the quotation, where the numbers have to be correct anyway, so maintaining a second copy is pure duplicate entry.

**KK's existing practice was the decisive input.** In previous work, KK corrected the opportunity *amount* when the deal reached Won, Rejected, or Dropped. Two things follow. The correction was to the **amount, not the lines** — evidence that the amount was always the useful field and the lines never were. And the correction happened **at close**, meaning the value was stale for the entire period the deal was open, which is exactly the period a forecast is about.

Quantified on the deal above: correct at close, but understated by 34–38% for the 22 days it was open. With 15–40 open deals per SE, all sitting at first-guess values, the pipeline total is systematically wrong — and biased in one direction, since scope tends to grow between inquiry and quotation, so it under-forecasts consistently rather than averaging out.

## Options considered

1. **Keep both, sync automatically** — copy quotation lines back to the opportunity on every issue.
   - Pro: the opportunity always reconciles.
   - Con: the opportunity lines become a stale mirror carrying no independent information. Storage and complexity for a derived copy.
2. **Keep both, sync manually** — KK's previous practice, formalised.
   - Pro: familiar; the closed number ends up right.
   - Con: open deals stay stale, which is where forecasting lives. Manual steps get skipped exactly where it matters most — nobody carefully updates the value of a deal they just lost, so loss analysis is the least accurate part.
3. **Remove `OpportunityLineItem`.** The opportunity carries values; line detail lives only on quotations.
   - Pro: one place for line detail, no divergence possible, no duplicate entry. Automates what KK was doing manually — and does it continuously rather than once at close.
   - Con: no product-level detail on deals not yet quoted.

## Decision

**`OpportunityLineItem` is removed from the model.** Line detail exists only on `QuotationLineItem`.

**The opportunity carries three values**, each honest about what it is:

| Field | Set by | Meaning |
|---|---|---|
| `estimated_value` | SE, manually | First guess at inquiry. Explicitly a guess |
| `quoted_value` | System | Total of the **latest issued** quotation revision |
| `won_value` | SE at Won, defaulting to the accepted quotation total | What the customer actually ordered |

**`current_value`** — the single number used by the pipeline, forecast, and reports — resolves in order: `won_value` → `quoted_value` → `estimated_value`. Always the most authoritative figure available.

**Auto-follow with manual override.** `quoted_value` updates automatically when a quotation is issued or revised. `current_value` may be overridden manually at any time; once overridden, the system stops overwriting it and shows a marker distinguishing an automatic value from a manually set one.

**`won_value` is separately captured** at the Won stage, defaulting to the accepted quotation total but editable. Customers frequently issue a PO for less than quoted — partial scope, an item dropped.

**Margin is computed from quotation lines only.** Before a quotation exists there is no margin figure. This is honest: before a quotation there is no real costing.

## Rationale

Option 1 is the tempting one and does not survive scrutiny: if the opportunity's lines are always a copy of the latest quotation's, they carry no information the quotation does not already hold. Storing a derived duplicate invites exactly the divergence it was meant to prevent, the first time a sync fails or a second quotation exists.

Option 2 was rejected on evidence rather than theory — KK ran it for years, and it produces a correct number at exactly the moment the number stops mattering. Automating the same intent is strictly better: it does what KK was doing manually, at every point in the deal's life, without depending on anyone remembering.

The three-value split came out of KK's practice too. The habit of correcting the amount at close implies the quotation total is *not* reliably the won value — otherwise there would have been nothing to correct. Making that an explicit field rather than an overwrite preserves the distinction, and **quoted-versus-won becomes a genuinely useful number**: how much scope VCS loses between offer and purchase order. That metric did not exist in either the previous system or the earlier design here; it falls out of modelling the reality properly.

The cost is real and narrow: no product-level detail on unquoted deals. VCS cannot ask "what pumps will we need from our principal next quarter?" for deals still at Lead or Inquiry Received. Judged acceptable because pre-quotation product guesses are not a sound basis for ordering anyway — a forecast built on them would be confidently wrong, which is the failure this project keeps trying to avoid. Deals at Quoted or later, where the answer is real, are still fully covered by quotation lines.

## Consequences

- **One entity removed** from the model, along with the UI to maintain it and the reporting ambiguity it created.
- Opportunity creation gets simpler and faster — an estimated value is one number, supporting the three-fields-to-create rule ([01-user-flows §1](../01-user-flows.md#1-design-principles)).
- Every money figure in the UI must be labelled with **which** value it is. An unlabelled "value" on a screen is now ambiguous between three things.
- The forecast uses `current_value`, and becomes materially more accurate for quoted deals — the largest single improvement to forecast quality in the design so far.
- **New report available:** quoted value vs. won value, by SE, principal, and period. Measures scope lost at the PO stage.
- Product-mix reporting covers Quoted and later only. Reports must state this rather than implying full coverage.
- The manual-override marker must be visible, or nobody will trust the auto-updated figure.
- Multi-currency ([ADR-0015](0015-multi-currency.md)): all three values carry currency and a frozen rate. If a quotation is issued in USD and the estimate was in THB, `current_value` changes currency — the UI must handle that without confusion.
- Relates to open question F7 ([01-user-flows §10](../01-user-flows.md#10-what-the-flows-revealed)): with two live quotations on one deal, "latest issued" needs a primary-quotation override.

## Revisit when

VCS needs product-mix forecasting on unquoted deals — for example, if principal ordering moves to a longer lead time and pre-quotation demand signals become genuinely valuable. The right response then is a lightweight "expected products" list for planning, explicitly not a costed line-item set.
