// Testing priority 4 (continued): line and document totals, percent and
// amount discounts, FX-converted cost margin.
import { describe, expect, it } from 'vitest'
import { lineAmount, lineMargin, quotationTotals } from '@/lib/quotations/totals'

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
    // 0.1 * 0.3 = 0.03 exactly; floats give 0.030000000000000002
    expect(lineAmount({ quantity: '0.1', unitPrice: '0.3' })).toBe('0.03')
  })

  it('rejects a discount exceeding the line', () => {
    expect(() =>
      lineAmount({ quantity: '1', unitPrice: '100', discountType: 'amount', discountValue: '200' }),
    ).toThrow()
  })
})

describe('quotationTotals', () => {
  it('computes Total, VAT 7% and Grand Total', () => {
    const t = quotationTotals(['16250.00', '850.00'], true)
    expect(t.total).toBe('17100.00')
    expect(t.vat).toBe('1197.00')
    expect(t.grandTotal).toBe('18297.00')
  })

  it('VAT rounds half-up on the summed total', () => {
    // 100.05 * 0.07 = 7.0035 → 7.00 ; 100.10 * 0.07 = 7.007 → 7.01
    expect(quotationTotals(['100.05'], true).vat).toBe('7.00')
    expect(quotationTotals(['100.10'], true).vat).toBe('7.01')
  })

  it('omits VAT when not applied', () => {
    const t = quotationTotals(['1000.00'], false)
    expect(t.vat).toBe('0.00')
    expect(t.grandTotal).toBe('1000.00')
  })
})

describe('lineMargin', () => {
  it('converts cost through the quotation-level FX rate (ADR-0040)', () => {
    // price 1000 THB, cost 20 EUR at 38.50 → cost 770 THB, margin 230 per unit
    const m = lineMargin({ quantity: '2', unitPrice: '1000.00', unitCost: '20.00' }, '38.50')
    expect(m).toBe('460.00')
  })

  it('returns null when no cost is recorded', () => {
    expect(lineMargin({ quantity: '1', unitPrice: '100' })).toBeNull()
  })
})
