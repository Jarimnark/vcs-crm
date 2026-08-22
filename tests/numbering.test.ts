import { describe, expect, it } from 'vitest'
import { formatQuotationNumber } from '@/lib/quotations/numbering'

describe('quotation numbering', () => {
  it('formats prefix + five digits', () => {
    expect(formatQuotationNumber('QUO', 69055)).toBe('QUO69055')
    expect(formatQuotationNumber('QUO', 1)).toBe('QUO00001')
  })

  it('does not truncate beyond five digits', () => {
    expect(formatQuotationNumber('QUO', 123456)).toBe('QUO123456')
  })
})
