# ADR-0021: Quotations carry VAT — stored net, displayed net / VAT / gross

- **Status:** Accepted — confirmed by the samples
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Resolves:** Open question Q12 (partially — withholding tax still open)

> **Confirmed 2026-08-11.** Both live samples show net prices with **VAT 7%** as a separate line and a grand total — exactly the treatment decided here. Two additions from the client spec: a **VAT toggle** for export and zero-rated sales (`vat_applied`, `vat_rate` on the quotation), and a **withholding tax note** for service projects. Q12b (whether WHT appears on a quotation) is answered: neither sample shows it.

## Context

Q12 asked whether VCS quotes prices VAT-inclusive or exclusive. KK answered: **"with tax."**

The quotation therefore carries VAT and shows a tax-bearing total. What that answer does *not* settle is how the number is **stored**, and that distinction matters more than it sounds. "With tax" could mean the SE types a gross price and the system works backwards to net, or that the SE types a net price and the system adds VAT. Both produce a quotation "with tax"; they behave very differently under discounts and rounding.

## Options considered

1. **Store gross (VAT-inclusive) unit prices.** The SE types what the customer pays.
   - Pro: matches how a price is often quoted verbally.
   - Con: every net figure and the VAT amount are derived by division, which introduces rounding drift that compounds across line items. Margin calculations — which compare price against a cost that has no VAT in it — must strip VAT out first, on every line, every time. Discounts applied to gross amounts produce net figures with fractional satang.

2. **Store net (VAT-exclusive) unit prices; compute and display VAT.**
   - Pro: VAT is computed once, at the document level, from a clean subtotal. Margin compares net price against net cost directly, with no extraction step. Discounts apply to net amounts where they belong.
   - Con: if VCS's SEs think in gross prices, the entry field does not match their mental model.

## Decision

**Unit prices are stored net (excluding VAT).** VAT is computed by the system.

**Every quotation displays all three figures:**

```
Subtotal (before VAT)        xxx,xxx.xx
Discount                      -xx,xxx.xx
Net amount                    xxx,xxx.xx
VAT 7%                         xx,xxx.xx
Grand total                   xxx,xxx.xx
```

This satisfies "with tax" under either reading — the customer sees a tax-inclusive grand total, and the breakdown makes the treatment explicit rather than implied.

**VAT rate is configurable**, defaulting to 7%. Not hard-coded: rates change, and some line items (certain services, exports) may be zero-rated or exempt. Each line carries a VAT treatment flag — `standard` / `zero-rated` / `exempt`.

**Discounts apply to the net subtotal**, before VAT.

**Withholding tax is not shown on the quotation.** WHT is deducted by the customer at payment, is a function of the service type and the payee, and does not belong on a commercial offer. If VCS's customers expect to see it, this needs revisiting — see below.

## Rationale

Storing net is the reversible choice. A net figure can always render a correct gross one; going the other way requires division and loses precision, and that loss shows up as satang-level discrepancies that make a customer-facing document look sloppy. Rounding errors on a quotation are disproportionately damaging — they invite the customer to question the whole document.

The margin argument is decisive on its own. Cost figures from principals ([ADR-0014](0014-product-catalogue-in-phase-1.md)) never include Thai VAT, often arriving in USD or EUR ([ADR-0015](0015-multi-currency.md)). Comparing a gross THB price against a net foreign cost requires extracting VAT before every single margin calculation. Storing net means margin is simply price minus cost, and the one place that can go wrong is removed.

Making the rate configurable rather than a constant costs nothing now and avoids a code change the day the rate moves or an export order needs zero-rating.

## Consequences

- The quotation entry screen must make it obvious that the price field is **excluding VAT**, with a live grand total visible while editing so the SE always sees what the customer will see.
- If it turns out VCS's SEs genuinely quote gross, add a per-user or per-document "enter prices inclusive" toggle that converts on entry and stores net. Store net regardless.
- Rounding is applied once, at the document total, not per line.
- The `Money` value type ([ADR-0015](0015-multi-currency.md)) holds net amounts throughout. VAT is a document-level derived figure, not a stored column per line.
- **Withholding tax remains open (Q12b).** It is low risk for the quotation itself but will matter if the CRM ever touches invoicing (Q14).
- Zero-rated and exempt handling needs a real example before it is built — do not guess the rules.

## Revisit when

A real VCS quotation becomes available (Q16) — it will show the actual layout, wording, and whether WHT appears. Also revisit if the VAT rate or export treatment changes.
