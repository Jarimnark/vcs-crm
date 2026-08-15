# ADR-0040: One FX rate per quotation, not per line

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Domain model
- **Refines:** [ADR-0035](0035-tech-stack-django-weasyprint.md), [ADR-0015](0015-multi-currency.md)

## Context

The client's model puts `unit_cost` and `cost_currency` on the quotation line and a single selling currency on the quotation header, and defers FX to Phase 2. That leaves margin uncomputable in the normal case: VCS buys DELO products from Germany in EUR and sells in Thai Baht. Since **margin reporting is the stated reason for capturing cost at all**, the gap had to be closed in Phase 1 ([ADR-0027](0027-adopt-client-phase-1-specification.md)).

[ADR-0035](0035-tech-stack-django-weasyprint.md) and the first draft of [`02-data-model.md`](../02-data-model.md) proposed a rate column on **each line**. KK chose instead: **one manually-entered rate per quotation, frozen at issue.**

## Options considered

1. **Full frozen-rate model** ([ADR-0015](0015-multi-currency.md) as originally written) — effective-dated `ExchangeRate` table, THB reporting base, four columns per monetary amount.
   - Pro: most correct; handles anything.
   - Con: a rate table to maintain monthly, four columns on every money field, and a staleness problem when nobody updates it. Disproportionate for five users and one dominant supplier currency.
2. **Rate per line.**
   - Pro: handles a quotation mixing EUR and USD costs.
   - Con: the engineer enters the same rate repeatedly on a multi-line quotation, and can enter it *inconsistently* — two lines with different EUR rates on one document, which is silently wrong and hard to spot.
3. **One rate per quotation** — chosen.
   - Pro: entered once, cannot be internally inconsistent, one field. Matches the reality that a quotation's costs almost always come from one supplier in one currency.
   - Con: **all lines on a quotation must share one cost currency.**

## Decision

**Two fields on `quotation`:**

| Column | Type | Null | Notes |
|---|---|---|---|
| `cost_currency` | CHAR(3) | ✓ | The currency all line costs are entered in. Often `EUR` |
| `fx_rate_cost_to_selling` | NUMERIC(14,6) | ✓ | Manually entered. **Frozen at issue.** `1.0` when cost and selling currency match |

**`cost_currency` moves off the line.** `quotation_line` keeps `unit_cost` only; the currency and rate are header-level.

**Margin:**
```
line_cost   = quantity × unit_cost × quotation.fx_rate_cost_to_selling
line_margin = amount − line_cost          -- in the quotation's selling currency
```

**The rate is frozen at issue**, alongside the client snapshot and VAT rate. A rate change next month must never alter the margin recorded on a quotation already sent — otherwise historical margin reports change on their own, which is the failure [ADR-0015](0015-multi-currency.md) exists to prevent.

**A small `ExchangeRate` reference table is optional** — currency, effective date, rate — purely to *pre-fill* the field so nobody types a rate from memory. It is a convenience, not a source of truth: the value stored on the quotation is what counts, and the engineer may override it.

**Validation:** if `cost_currency` differs from `currency` and `fx_rate_cost_to_selling` is null, **block issue** — do not silently record a null or wrong margin. This is the one place where getting it wrong is worse than being asked.

## Rationale

The per-line option looks more capable and is actually worse in the likely failure mode. Entering the same EUR rate on eight lines invites inconsistency, and eight slightly different rates on one document produce a total margin that is wrong in a way nobody will notice — no error, no null, just a plausible number. One rate per document cannot be internally inconsistent. Fewer places to be wrong beats more places to be right.

The full [ADR-0015](0015-multi-currency.md) model is the correct general answer and the wrong answer here. Its rate table needs monthly maintenance, and an unmaintained rate table is worse than no rate table — it silently supplies stale numbers with an air of authority. At five users, with EUR dominating, a value typed once per quotation and frozen is both simpler and more likely to be right, because the engineer enters it while looking at the actual supplier quote.

Freezing is the non-negotiable part, and it is [ADR-0015](0015-multi-currency.md)'s one surviving principle. Recomputing margin from today's rate would mean last quarter's margin report differs this quarter — and a number that moves on its own destroys confidence in every number beside it.

## Consequences

- **All line costs on one quotation share a currency.** If a quotation genuinely mixes EUR and USD supplier costs, the model does not fit — the engineer must convert one manually into the quotation's cost currency, or the rate moves to the line. **Worth watching for; if it happens more than rarely, revisit.**
- `cost_currency` is removed from `quotation_line`. [`02-data-model.md`](../02-data-model.md) §6.2 updated.
- The quotation builder needs a visible cost-currency and rate control near the totals, not buried — the engineer should see which rate produced the margin they are looking at.
- Issue is blocked when the rate is missing and currencies differ. Better a prompt than a null margin.
- The optional pre-fill table is genuinely optional. Skip it in the first build; add it if engineers start asking "what rate did we use last time?".
- Phase 2's pricing engine will likely need the full [ADR-0015](0015-multi-currency.md) model. This is the minimum that makes Phase 1 margin real, not the end state.
- Reporting margin across quotations in different selling currencies still needs a THB conversion. Out of scope for Phase 1 — margin is reported **per quotation in its own currency**, and any cross-quotation total must say which currency it is in or be restricted to THB quotations.

## Revisit when

A quotation needs two cost currencies, or Phase 2's pricing engine arrives — at which point the full effective-dated model becomes worth its maintenance cost.
