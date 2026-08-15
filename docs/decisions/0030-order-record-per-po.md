# ADR-0030: An Order record per purchase order

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK / client analyst recommendation, `phase1-architecture-decisions.md` A3
- **Phase:** Domain model
- **Supersedes:** [ADR-0026](0026-opportunity-value-not-line-items.md)

## Context

Because consumable projects continue across repeat orders ([ADR-0029](0029-project-types-and-repeat-orders.md)), a single `amount` field on the project becomes wrong the moment a second purchase order arrives. Two questions then have no answer:

- How much has this client actually bought this year?
- What is our margin on this relationship over time?

The second matters most. `unit_cost` is captured on every quotation line **specifically so margin is reportable** — that is the stated reason for collecting it. Without something to attach cost to after the first sale, the reason for collecting it evaporates on exactly the accounts VCS most wants to understand.

This log had already worked the same ground from a different direction. [ADR-0026](0026-opportunity-value-not-line-items.md) removed `OpportunityLineItem` and introduced three values on the opportunity — `estimated_value`, `quoted_value`, `won_value` — after KK described manually correcting the amount at close. That model handled *one* sale well and had no answer for the second.

## Options considered

1. **`amount` = first order only.** Repeat revenue invisible.
   - Pro: nothing to build.
   - Con: silently wrong on the accounts that matter most, and the cost data collected becomes unusable after the first sale. Adding Order later means backfilling PO history by hand.
2. **`amount` updated manually to a cumulative total.**
   - Pro: no new entity.
   - Con: destroys the forecast — a cumulative actual sitting in a field the pipeline weights by progress. And it is the manual-discipline pattern already shown to fail in [ADR-0026](0026-opportunity-value-not-line-items.md): corrections happen late or not at all.
3. **A lightweight `Order` record per PO.** Seven fields.
   - Pro: forecast and actuals become separate concerns and stop corrupting each other. Margin over time computable. Follow-up timing gets a natural anchor.
   - Con: one more entity, and one more thing to remember to enter.

## Decision

**Add `Order`:**

| Field | Notes |
|---|---|
| `project` | Parent |
| `po_number` | Client's PO reference |
| `po_date` | |
| `source_quotation` | Optional — which quotation this PO accepted |
| `amount`, `currency` | Order value |
| `status` | ordered / delivered / invoiced |

**`Project.amount` becomes `Project.expected_amount`** — a forecast, used only for pipeline weighting. **Actual revenue is the sum of Orders.**

**Reporting reads forecast from Project and actuals from Order.** These are never added together and never substituted for one another.

**The follow-up interval counts from the most recent `po_date`** ([ADR-0029](0029-project-types-and-repeat-orders.md)).

**`quoted_value` is retained as a derived figure** — the total of the latest issued quotation, maintained automatically. It is not in the client's specification, and it is kept because it is free (the data is already there), it materially improves forecast accuracy, and removing it would discard the one finding from [ADR-0026](0026-opportunity-value-not-line-items.md) that survives this change. See below.

## Rationale

The forecast/actual split is the substance of this decision. [ADR-0026](0026-opportunity-value-not-line-items.md) tried to make one field carry the deal's value through its whole life, resolving `won → quoted → estimated`. That works for a deal that closes once. It cannot work for a project that keeps selling, because "the value of this project" stops being a single number and becomes a series. Once it is a series, it needs rows.

**Keeping `quoted_value` deserves justification, since it is an addition to the client's spec.** [ADR-0026](0026-opportunity-value-not-line-items.md) quantified the problem it solves: an expected amount typed at inquiry was 34–38% below the quoted figure for the 22 days the example deal was open, and biased consistently low, because scope grows between inquiry and quotation. With 15–40 open projects per user all sitting at first guesses, the pipeline total is systematically understated. Deriving the quoted figure costs nothing — it is a rollup of `Quotation.grand_total` for the latest issued revision — and it is strictly more accurate than the estimate it replaces once a quotation exists. Discarding it would reintroduce a known error for no saving.

So the pipeline weights `COALESCE(quoted_value, expected_amount) × progress`, and reports the actuals separately from Orders. Three numbers, three purposes, none pretending to be another.

`source_quotation` being optional rather than required is deliberate: repeat consumable orders frequently arrive against a standing price with no fresh quotation, and requiring a link would either block the entry or invite a false one.

## Consequences

- Orders must be entered for actual revenue to exist. This is the one piece of data entry in Phase 1 that primarily serves reporting rather than the user's own work — the [ADR-0001](0001-build-for-the-sales-engineer-first.md) tension. It is accepted because it is small (seven fields, once per PO) and because the follow-up recurrence the user *does* want depends on it, which aligns the incentive.
- **Quoted-versus-ordered becomes reportable**: how much scope is lost between offer and purchase order. Carried over from [ADR-0026](0026-opportunity-value-not-line-items.md).
- Every money figure in the UI must be labelled which of the three it is. An unlabelled "amount" is now ambiguous across `expected_amount`, `quoted_value`, and Order totals.
- `Order.status` (ordered / delivered / invoiced) is a *fulfilment* status. It must not be mistaken for evidence that an invoice was issued — the CRM does not issue invoices ([ADR-0018](0018-no-erp-invoice-boundary.md)) and `invoiced` here is a user assertion.
- Multi-currency: orders carry their own currency. Summing a project's orders requires conversion, which is the same gap flagged in [ADR-0027](0027-adopt-client-phase-1-specification.md) and resolved in `02-data-model.md`.
- Deleting or voiding an order must be possible — POs get cancelled. Prefer a void flag over deletion so history survives.

## Revisit when

Phase 2 adds delivery or invoice tracking, at which point `Order.status` may need to become a real state machine rather than a user-set field.
