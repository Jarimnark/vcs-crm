// Shared fixture: a quotation carrying sentinel values on every internal
// field. Both halves of testing priority 1 use it — the whitelist unit test
// and the render-service integration test.
import type { QuotationWithLines } from '@/lib/pdf/context'

export const SENTINEL_COST = '123456.78'
export const SENTINEL_TOTAL_COST = '987654.32'
export const SENTINEL_FX = '424242.424242'
export const SENTINELS = ['123456', '123,456', '987654', '987,654', '424242', '99999.99']

export function makeSentinelQuotation(): QuotationWithLines {
  return {
    company: {
      nameTh: 'บริษัท ทดสอบ จำกัด',
      nameEn: 'Test Co., Ltd.',
      addressTh: 'กรุงเทพฯ',
      addressEn: 'Bangkok',
      tel: '02-000-0000',
    },
    quotation: {
      number: 'QUO69055',
      revision: 0,
      date: '2026-08-15',
      validityText: 'Until 30/9/2026',
      paymentTermText: 'Cash',
      leadTimeText: '6-8 weeks after receipt of delivery confirmation.',
      currency: 'THB',
      incoterm: 'DDP',
      countryOfOrigin: 'Germany',
      vatApplied: true,
      billToName: 'Customer Co., Ltd.',
      billToAddress: '123 Road, Bangkok',
      attentionName: 'Khun Somchai',
      salespersonName: 'Chayutpon T.',
      salespersonPhone: '099-087-8038',
      totalAmount: '16250.00',
      vatAmount: '1137.50',
      grandTotal: '17387.50',
      // Internal fields deliberately present on the row — the whitelist
      // must drop them.
      costCurrency: 'EUR',
      fxRate: SENTINEL_FX,
    },
    lines: [
      {
        sequence: 1,
        itemCode: '1749560',
        itemName: 'DELO DUALBOND AD4950 600 g',
        quantity: '13.000',
        unit: 'ea',
        unitPrice: '1250.00',
        amount: '16250.00',
        // The fields that must never leave the building:
        unitCost: SENTINEL_COST,
        totalCost: SENTINEL_TOTAL_COST,
        margin: '99999.99',
        components: [{ quantity: '1', code: '9070456', name: 'DELO-DIV VD330' }],
      },
    ],
  }
}
