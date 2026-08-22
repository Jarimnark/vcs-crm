// Quotation arithmetic — decimal.js only (G3), per docs/02-data-model.md
// §6.2 and ADR-0046 B3.
//
// Rounding policy (02 §6.2 says "once, at document total"): each printed
// line amount is rounded once, from exact inputs, to the 2 dp the customer
// sees; the subtotal is the exact sum of those printed amounts, so the
// document always adds up to what is visibly printed — no compounding,
// because nothing rounded is ever multiplied onward. The cost/margin chain
// (fx conversion × quantity) keeps full precision and rounds only the final
// stored values.
import { Decimal, toDecimal, roundMoney, toMoneyString, type MoneyString } from '@/lib/money'

export interface LineInput {
  quantity: MoneyString
  unitPrice: MoneyString
  // ADR-0046 B3: the user enters either form; discountType records which.
  discountType?: 'amount' | 'percent' | null
  discountValue?: MoneyString | null
}

export interface QuotationTotals {
  subtotal: MoneyString
  discountTotal: MoneyString
  vat: MoneyString
  grandTotal: MoneyString
}

function lineGross(line: LineInput): Decimal {
  return toDecimal(line.quantity).times(toDecimal(line.unitPrice))
}

function lineDiscount(line: LineInput): Decimal {
  if (!line.discountType || line.discountValue == null) return new Decimal(0)
  const v = toDecimal(line.discountValue)
  return line.discountType === 'percent' ? lineGross(line).times(v).div(100) : v
}

/** Line amount = quantity × unit price − discount, rounded once to 2 dp. */
export function lineAmount(line: LineInput): MoneyString {
  const net = lineGross(line).minus(lineDiscount(line))
  if (net.isNegative()) throw new Error('Discount exceeds line amount')
  return toMoneyString(roundMoney(net))
}

/**
 * ADR-0046 B3 dual entry: given one discount form, derive the other for
 * display. Returns null when it cannot be derived (no discount, zero gross).
 */
export function deriveCounterpartDiscount(line: LineInput): {
  amount: MoneyString
  percent: MoneyString
} | null {
  if (!line.discountType || line.discountValue == null) return null
  const gross = lineGross(line)
  if (gross.isZero()) return null
  const amount = lineDiscount(line)
  const percent = amount.times(100).div(gross)
  return {
    amount: toMoneyString(roundMoney(amount)),
    percent: percent.toDecimalPlaces(2).toFixed(2),
  }
}

/**
 * Document totals. Subtotal = Σ gross; discount_total = Σ line discounts;
 * VAT applies to (subtotal − discount) at the quotation's stored rate
 * (snapshotted from company — 02 §6.1); grand total = net + VAT.
 */
export function quotationTotals(
  lines: LineInput[],
  vatApplied: boolean,
  vatRate: MoneyString = '7.00',
): QuotationTotals {
  const subtotal = lines.reduce((acc, l) => acc.plus(lineGross(l)), new Decimal(0))
  const discountTotal = lines.reduce((acc, l) => acc.plus(lineDiscount(l)), new Decimal(0))
  const net = subtotal.minus(discountTotal)
  if (net.isNegative()) throw new Error('Discounts exceed subtotal')
  const vat = vatApplied ? roundMoney(net.times(toDecimal(vatRate)).div(100)) : new Decimal(0)
  return {
    subtotal: toMoneyString(roundMoney(subtotal)),
    discountTotal: toMoneyString(roundMoney(discountTotal)),
    vat: toMoneyString(vat),
    grandTotal: toMoneyString(roundMoney(net).plus(vat)),
  }
}

/**
 * Internal cost chain (02 §6.2): full precision until the final stored
 * values. unit_cost is in quotation.cost_currency; the header-level rate
 * (ADR-0040) converts to the selling currency.
 *
 *   line_cost   = quantity × unit_cost × fx_rate_cost_to_selling
 *   line_margin = amount − line_cost
 */
export function lineCostAndMargin(
  line: LineInput & { unitCost?: MoneyString | null },
  fxRateCostToSelling?: MoneyString | null,
): { lineCost: MoneyString; lineMargin: MoneyString } | null {
  if (line.unitCost == null) return null
  const rate = fxRateCostToSelling ? toDecimal(fxRateCostToSelling) : new Decimal(1)
  const cost = toDecimal(line.quantity).times(toDecimal(line.unitCost)).times(rate)
  const margin = toDecimal(lineAmount(line)).minus(cost)
  return {
    lineCost: toMoneyString(roundMoney(cost)),
    lineMargin: toMoneyString(roundMoney(margin)),
  }
}
