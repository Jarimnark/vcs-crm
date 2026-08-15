// Testing priority 1 (unit half): cost never enters the render payload.
// Sentinel values on every internal field; the serialized context must not
// contain them. The CI workflow runs the other half — the same payload
// through the real WeasyPrint container, asserting the extracted PDF text is
// clean across the network boundary.
import { describe, expect, it } from 'vitest'
import {
  buildQuotationPdfContext,
  PDF_COMPANY_FIELDS,
  PDF_LINE_FIELDS,
  PDF_QUOTATION_FIELDS,
} from '@/lib/pdf/context'
import { makeSentinelQuotation, SENTINELS } from './helpers/sentinel-quotation'

describe('the cost-leak whitelist', () => {
  it('no whitelist contains a cost or margin field name', () => {
    const all = [...PDF_COMPANY_FIELDS, ...PDF_QUOTATION_FIELDS, ...PDF_LINE_FIELDS]
    for (const field of all) {
      expect(field.toLowerCase()).not.toMatch(/cost|margin|fx/)
    }
  })

  it('sentinel cost values never appear in the serialized context', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    const serialized = JSON.stringify(context)
    for (const sentinel of SENTINELS) {
      expect(serialized).not.toContain(sentinel)
    }
  })

  it('cost keys are absent, not empty — absent cannot regress to visible', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    expect(context.lines[0]).not.toHaveProperty('unitCost')
    expect(context.lines[0]).not.toHaveProperty('totalCost')
    expect(context.lines[0]).not.toHaveProperty('margin')
    expect(context.quotation).not.toHaveProperty('fxRate')
    expect(context.quotation).not.toHaveProperty('costCurrency')
  })

  it('whitelisted content does arrive (the test is not passing vacuously)', () => {
    const context = buildQuotationPdfContext(makeSentinelQuotation())
    expect(context.quotation.number).toBe('QUO69055')
    expect(context.quotation.dateText).toBe('15/08/2026')
    expect(context.quotation.grandTotalText).toBe('17,387.50')
    expect(context.lines[0].itemName).toBe('DELO DUALBOND AD4950 600 g')
    expect(context.lines[0].amountText).toBe('16,250.00')
  })

  it('revision renders as a -R suffix (B4 recommended default)', () => {
    const q = makeSentinelQuotation()
    q.quotation.revision = 2
    const context = buildQuotationPdfContext(q)
    expect(context.quotation.number).toBe('QUO69055-R2')
  })
})
