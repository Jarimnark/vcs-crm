import { describe, expect, it } from 'vitest'
import { formatQuotationNumber } from '@/lib/quotations/numbering'

describe('quotation numbering', () => {
  it('formats QUO##### with five digits', () => {
    expect(formatQuotationNumber(69055)).toBe('QUO69055')
    expect(formatQuotationNumber(1)).toBe('QUO00001')
  })

  it('does not truncate beyond five digits', () => {
    expect(formatQuotationNumber(123456)).toBe('QUO123456')
  })
})
