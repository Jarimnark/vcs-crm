// Quotation arithmetic — decimal.js only (G3). Client-side previews reuse
// these exact functions so the browser number and the saved number agree by
// construction (docs/03-tech-stack.md §6).
import { Decimal, toDecimal, roundMoney, toMoneyString, type MoneyString } from '@/lib/money'

export interface LineInput {
  quantity: MoneyString
  unitPrice: MoneyString
  // Discount format is open question B3 — both shapes are supported.
  discountType?: 'amount' | 'percent' | null
  discountValue?: MoneyString | null
}

export interface QuotationTotals {
  total: MoneyString
  vat: MoneyString
  grandTotal: MoneyString
}

export const VAT_RATE = new Decimal('0.07') // both samples apply VAT 7%

/** Line amount = quantity × unit price − discount, rounded half-up to 2 dp. */
export function lineAmount(line: LineInput): MoneyString {
  const qty = toDecimal(line.quantity)
  const price = toDecimal(line.unitPrice)
  const gross = qty.times(price)

  let discount = new Decimal(0)
  if (line.discountType && line.discountValue != null) {
    const v = toDecimal(line.discountValue)
    discount = line.discountType === 'percent' ? gross.times(v).div(100) : v
  }

  const net = gross.minus(discount)
  if (net.isNegative()) {
    throw new Error('Discount exceeds line amount')
  }
  return toMoneyString(roundMoney(net))
}

/**
 * Document totals: Total = Σ line amounts; VAT 7% on the total (when applied);
 * Grand Total = Total + VAT. Continuous totals, last page only (ADR-0031).
 */
export function quotationTotals(lineAmounts: MoneyString[], vatApplied: boolean): QuotationTotals {
  const total = lineAmounts.reduce((acc, a) => acc.plus(toDecimal(a)), new Decimal(0))
  const vat = vatApplied ? roundMoney(total.times(VAT_RATE)) : new Decimal(0)
  return {
    total: toMoneyString(total),
    vat: toMoneyString(vat),
    grandTotal: toMoneyString(total.plus(vat)),
  }
}

/**
 * Line margin, for internal display only: (price − cost-in-quote-currency) × qty.
 * `fxRate` converts the cost currency to the quotation currency (ADR-0040 —
 * one rate per quotation, frozen at issue). Never enters the PDF context.
 */
export function lineMargin(
  line: LineInput & { unitCost?: MoneyString | null },
  fxRate?: MoneyString | null,
): MoneyString | null {
  if (line.unitCost == null) return null
  const rate = fxRate ? toDecimal(fxRate) : new Decimal(1)
  const costInQuoteCurrency = toDecimal(line.unitCost).times(rate)
  const amount = toDecimal(lineAmount(line))
  const totalCost = costInQuoteCurrency.times(toDecimal(line.quantity))
  return toMoneyString(roundMoney(amount.minus(totalCost)))
}
