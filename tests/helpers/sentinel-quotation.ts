// Shared fixture: a quotation carrying sentinel values on every internal
// field (02 §10: unit_cost, cost_currency, fx_rate_cost_to_selling,
// line_cost, line_margin, total_cost, total_margin). Both halves of testing
// priority 1 use it — the whitelist unit test and the render-service
// integration test.
import type { QuotationWithLines } from '@/lib/pdf/context'

export const SENTINELS = [
  '123456', // unit_cost
  '123,456',
  '987654', // line_cost / total_cost
  '987,654',
  '424242', // fx rate
  '555555', // line_margin / total_margin
  '555,555',
]

export function makeSentinelQuotation(): QuotationWithLines {
  return {
    company: {
      nameTh: 'บริษัท ทดสอบ จำกัด',
      nameEn: 'Test Co., Ltd.',
      addressTh: 'กรุงเทพฯ',
      addressEn: 'Bangkok',
      phone: '02-000-0000',
      footerTextTh: 'ขอขอบพระคุณ',
      footerTextEn: 'Thank you.',
    },
    quotation: {
      quotationNo: 'QUO69055',
      revision: 1,
      quotationDate: '2026-08-15',
      validityText: 'Until 30/9/2026',
      paymentTermText: 'Cash',
      leadTimeText: '6-8 weeks after receipt of delivery confirmation.',
      currency: 'THB',
      incoterm: 'DDP',
      countryOfOrigin: 'Germany',
      vatApplied: true,
      vatRate: '7.00',
      billToName: 'Customer Co., Ltd.',
      billToAddress: '123 Road, Bangkok',
      attentionName: 'Khun Somchai',
      salespersonName: 'Chayutpon T.',
      salespersonMobile: '099-087-8038',
      subtotal: '16250.00',
      discountTotal: '0.00',
      vatAmount: '1137.50',
      grandTotal: '17387.50',
      // Internal fields deliberately present on the row — the whitelist
      // must drop them.
      costCurrency: 'EUR',
      fxRateCostToSelling: '424242.424242',
      totalCost: '987654.32',
      totalMargin: '555555.55',
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
        unitCost: '123456.78',
        lineCost: '987654.32',
        lineMargin: '555555.55',
        components: [{ quantity: '1', itemCode: '9070456', itemName: 'DELO-DIV VD330' }],
      },
    ],
  }
}
