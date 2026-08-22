// Testing priority 1 (unit half): cost never enters the render payload.
// Sentinel values on every internal field; the serialized context must not
// contain them. tests/pdf-render.test.ts runs the other half through the
// real WeasyPrint container.
import { describe, expect, it } from 'vitest'
import {
  buildQuotationPdfContext,
  PDF_COMPANY_FIELDS,
  PDF_LINE_FIELDS,
  PDF_QUOTATION_FIELDS,
} from '@/lib/pdf/context'
import { makeSentinelQuotation, SENTINELS } from './helpers/sentinel-quotation'

describe('the cost-leak whitelist', () => {
  it('no whitelist contains a cost, margin or fx field name', () => {
    const all = [...PDF_COMPANY_FIELDS, ...PDF_QUOTATION_FIELDS, ...PDF_LINE_FIELDS]
    for (const field of all) {
      expect(field.toLowerCase()).not.toMatch(/cost|margin|fx/)
    }
  })

  it('sentinel values never appear in the serialized context', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    const serialized = JSON.stringify(context)
    for (const sentinel of SENTINELS) {
      expect(serialized).not.toContain(sentinel)
    }
  })

  it('cost keys are absent, not empty — absent cannot regress to visible', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    for (const key of ['unitCost', 'lineCost', 'lineMargin']) {
      expect(context.lines[0]).not.toHaveProperty(key)
    }
    for (const key of ['costCurrency', 'fxRateCostToSelling', 'totalCost', 'totalMargin']) {
      expect(context.quotation).not.toHaveProperty(key)
    }
  })

  it('whitelisted content does arrive (the test is not passing vacuously)', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    expect(context.quotation.quotationNo).toBe('QUO69055')
    expect(context.quotation.dateText).toBe('15/08/2026')
    expect(context.quotation.vatRateText).toBe('7')
    expect(context.quotation.grandTotalText).toBe('17,387.50')
    expect(context.lines[0].itemName).toBe('DELO DUALBOND AD4950 600 g')
    expect(context.lines[0].amountText).toBe('16,250.00')
  })

  it('revision 1 is the original; revision 2 renders as -R2 (B4)', () => {
    const q1 = makeSentinelQuotation()
    expect(buildQuotationPdfContext(q1).quotation.quotationNo).toBe('QUO69055')
    const q2 = makeSentinelQuotation()
    q2.quotation.revision = 2
    expect(buildQuotationPdfContext(q2).quotation.quotationNo).toBe('QUO69055-R2')
  })

  it('a zero discount prints as "-", matching the samples', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    expect(context.lines[0].discountText).toBe('-')
  })
})
