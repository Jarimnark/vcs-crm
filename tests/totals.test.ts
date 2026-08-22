// Testing priority 4: line and document totals, dual-entry discounts
// (ADR-0046 B3), FX-converted cost margin (ADR-0040), stored VAT rate.
import { describe, expect, it } from 'vitest'
import {
  deriveCounterpartDiscount,
  lineAmount,
  lineCostAndMargin,
  quotationTotals,
} from '@/lib/quotations/totals'

describe('lineAmount', () => {
  it('multiplies quantity by unit price', () => {
    expect(lineAmount({ quantity: '13', unitPrice: '1250.00' })).toBe('16250.00')
  })

  it('applies an amount discount', () => {
    expect(
      lineAmount({ quantity: '1', unitPrice: '1000.00', discountType: 'amount', discountValue: '150' }),
    ).toBe('850.00')
  })

  it('applies a percent discount', () => {
    expect(
      lineAmount({ quantity: '2', unitPrice: '500.00', discountType: 'percent', discountValue: '10' }),
    ).toBe('900.00')
  })

  it('handles fractional quantities without float error', () => {
    expect(lineAmount({ quantity: '0.1', unitPrice: '0.3' })).toBe('0.03')
  })

  it('rejects a discount exceeding the line', () => {
    expect(() =>
      lineAmount({ quantity: '1', unitPrice: '100', discountType: 'amount', discountValue: '200' }),
    ).toThrow()
  })
})

describe('deriveCounterpartDiscount (B3 dual entry)', () => {
  it('derives the percent from an entered amount', () => {
    const d = deriveCounterpartDiscount({
      quantity: '2',
      unitPrice: '500.00',
      discountType: 'amount',
      discountValue: '100',
    })
    expect(d).toEqual({ amount: '100.00', percent: '10.00' })
  })

  it('derives the amount from an entered percent', () => {
    const d = deriveCounterpartDiscount({
      quantity: '1',
      unitPrice: '1234.56',
      discountType: 'percent',
      discountValue: '7.5',
    })
    expect(d?.amount).toBe('92.59') // 1234.56 × 7.5% = 92.592 → half-up
    expect(d?.percent).toBe('7.50')
  })

  it('returns null when there is no discount', () => {
    expect(deriveCounterpartDiscount({ quantity: '1', unitPrice: '100' })).toBeNull()
  })
})

describe('quotationTotals', () => {
  it('computes subtotal, VAT and grand total at the stored rate', () => {
    const t = quotationTotals(
      [
        { quantity: '13', unitPrice: '1250.00' },
        { quantity: '1', unitPrice: '850.00' },
      ],
      true,
      '7.00',
    )
    expect(t.subtotal).toBe('17100.00')
    expect(t.discountTotal).toBe('0.00')
    expect(t.vat).toBe('1197.00')
    expect(t.grandTotal).toBe('18297.00')
  })

  it('applies VAT after discounts', () => {
    const t = quotationTotals(
      [{ quantity: '1', unitPrice: '1000.00', discountType: 'amount', discountValue: '100' }],
      true,
      '7.00',
    )
    expect(t.subtotal).toBe('1000.00')
    expect(t.discountTotal).toBe('100.00')
    expect(t.vat).toBe('63.00') // 7% of 900
    expect(t.grandTotal).toBe('963.00')
  })

  it('VAT rounds half-up once, at document level', () => {
    expect(quotationTotals([{ quantity: '1', unitPrice: '100.05' }], true, '7.00').vat).toBe('7.00')
    expect(quotationTotals([{ quantity: '1', unitPrice: '100.10' }], true, '7.00').vat).toBe('7.01')
  })

  it('omits VAT for export / zero-rated sales', () => {
    const t = quotationTotals([{ quantity: '1', unitPrice: '1000.00' }], false, '7.00')
    expect(t.vat).toBe('0.00')
    expect(t.grandTotal).toBe('1000.00')
  })

  it('honours a non-default VAT rate', () => {
    expect(quotationTotals([{ quantity: '1', unitPrice: '100.00' }], true, '10.00').vat).toBe('10.00')
  })
})

describe('lineCostAndMargin', () => {
  it('converts cost through the quotation-level FX rate (ADR-0040)', () => {
    // price 1000 THB ×2, cost 20 EUR at 38.50 → line cost 1540, margin 460
    const m = lineCostAndMargin(
      { quantity: '2', unitPrice: '1000.00', unitCost: '20.00' },
      '38.500000',
    )
    expect(m).toEqual({ lineCost: '1540.00', lineMargin: '460.00' })
  })

  it('defaults the rate to 1 when currencies match', () => {
    const m = lineCostAndMargin({ quantity: '1', unitPrice: '100.00', unitCost: '60.00' }, null)
    expect(m).toEqual({ lineCost: '60.00', lineMargin: '40.00' })
  })

  it('returns null when no cost is recorded', () => {
    expect(lineCostAndMargin({ quantity: '1', unitPrice: '100' })).toBeNull()
  })
})
