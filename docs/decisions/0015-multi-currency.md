# ADR-0015: Multi-currency with frozen rates and a THB reporting base

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Resolves:** Open question Q5

## Context

KK confirmed: **multi-currency**. This is the expected answer for an equipment distributor — principals quote in USD or EUR, customers pay in THB, and site visits abroad are expensed in local currency.

Multi-currency is one of those requirements that looks like a display concern and is actually a data-model concern. Getting it wrong is not a formatting bug; it silently corrupts every margin and every historical report, usually in a way nobody notices for months.

Three questions have to be answered together: what currency does each amount carry, how is it converted, and what happens to old records when the rate moves.

## Options considered

**Conversion approach**

1. **Store the original amount only, convert at read time** using today's rate.
   - Pro: no rate columns; one number per amount.
   - Con: every historical report changes every day. A deal won last March shows a different margin this week. Reports become unreproducible, and nobody trusts a number that moved on its own.

2. **Store the original amount plus a frozen rate and the converted base amount**, captured at transaction time.
   - Pro: history is stable. A quotation issued in March is worth what it was worth in March, permanently.
   - Con: three columns per money field; the rate must come from somewhere at the moment of entry.

3. **Store base currency only**, converting on entry and discarding the original.
   - Pro: simplest reporting.
   - Con: destroys the source figure. A quotation must display the currency it was issued in — a customer quoted in USD must see USD.

**Rate source**

1. **Live FX API.** Accurate, but adds an external dependency and a failure mode on a screen the SE needs to work offline-ish. Rates that move intraday also make two quotes issued the same day inconsistent.
2. **Manually maintained rate table**, effective-dated, owned by the manager. Predictable, auditable, matches how a small company actually books FX, and usually mirrors whatever rate the accountant uses.

## Decision

**Reporting base currency: THB.** All management reporting and cross-deal comparison happens in THB.

**Every monetary amount stores four things:** `amount`, `currency_code`, `fx_rate_to_thb`, `amount_thb`. The rate and converted value are **frozen at the moment the record is created or issued** and never recalculated.

**Rates come from an `ExchangeRate` table** — currency, effective date, rate — maintained by the Manager role. Entry screens pre-fill the rate in effect for the transaction date, and the user can override it on the record (a quotation may need to use the rate the customer agreed, not the table's).

**Cost and price currencies are independent.** `Product` and every line item carry cost currency and price currency separately, because VCS buys in USD/EUR and sells in THB. Margin is computed in THB from the frozen converted values on both sides.

**A quotation has exactly one currency**, chosen at creation. Mixed-currency line items on one customer-facing document are not allowed — the customer sees one currency and one total. Costs behind those lines may be in any currency.

**Expenses** carry their own currency and the rate at the expense date.

## Rationale

Freezing rates is the decision that matters. The alternative produces a system where last quarter's margin report is different this quarter, and the moment someone notices that, they stop believing the dashboard — which is precisely the failure [ADR-0007](0007-crm-is-not-the-financial-source-of-truth.md) exists to prevent. Storing the rate alongside the amount also makes every historical figure explainable: you can always point at the rate that produced it.

Keeping the original amount as well as the base amount is non-negotiable for customer-facing documents. A quotation is a commercial commitment in a specific currency; showing a converted approximation would be wrong.

Separating cost and price currency is the subtlety that is easy to miss and expensive to retrofit. A product bought at EUR 12,000 and sold at THB 500,000 has a margin only computable if both currencies are known. Collapsing to one currency field would make every margin figure quietly wrong — the worst kind of wrong, because it still looks plausible.

The manual rate table beats a live API here. VCS is small, and the rate that matters is the one the accountant uses, not the one the market shows at 14:32. It also removes an external dependency from a core screen.

## Consequences

- Every money column in the schema is really four columns. Define this once as a shared value type and reuse it — not hand-rolled per table.
- Someone must maintain the rate table. Monthly is likely enough; if it goes stale, quotations silently use an old rate. A staleness warning on the entry screen is worth building.
- Rate overrides must be visible on the record, so a reader can see when a non-standard rate was used and why.
- The forecast sums `amount_thb`, so a pipeline in USD does not shift as the baht moves. This is intentional and should be explained to whoever reads the forecast.
- Realised FX gain or loss between quotation and payment is **out of scope** — that is accounting's problem, per [ADR-0007](0007-crm-is-not-the-financial-source-of-truth.md).
- The quotation PDF must format currency correctly per locale, which interacts with bilingual output ([ADR-0016](0016-bilingual-thai-english.md)).

## Revisit when

VCS's reporting base changes, or if the accountant's rate methodology turns out to differ from a simple effective-dated table.
