// The cost-leak whitelist — the ONLY path from data to the PDF render
// service (docs/02-data-model.md §10, docs/03 §4.2, ADR-0031).
//
// unit_cost, cost_currency, fx_rate_cost_to_selling, line_cost, line_margin,
// total_cost and total_margin must never reach the exported PDF. The context
// is built from explicit allowlists, so cost fields are never in the
// payload — a template referencing them has nothing to resolve. The failure
// mode is "renders blank", not "leaks silently". The sentinel tests
// (tests/pdf-context.test.ts, tests/pdf-render.test.ts) are the guarantee.
import { formatMoney } from '@/lib/money'

// --- Allowlists (02 §10) ---------------------------------------------------

export const PDF_COMPANY_FIELDS = [
  'nameTh',
  'nameEn',
  'addressTh',
  'addressEn',
  'phone',
  'taxId',
  'logoDataUri',
  'footerTextTh',
  'footerTextEn',
  'termsText', // standard T&C — the page-2 content (ADR-0046 B2, T1)
] as const

export const PDF_QUOTATION_FIELDS = [
  'quotationNo',
  'revisionLabel',
  'dateText',
  'billToName',
  'billToAddress',
  'billToTaxId',
  'billToBranch',
  'validityText',
  'deliveryDateText',
  'paymentTermText',
  'currency',
  'currencyLabel',
  'incoterm',
  'countryOfOrigin',
  'leadTimeText',
  'remarks',
  'whtNote',
  'vatApplied',
  'vatRateText',
  'subtotalText',
  'discountTotalText',
  'vatText',
  'grandTotalText',
  'salespersonName',
  'salespersonMobile',
  'attentionName',
  'attentionEmail',
  'attentionPhone',
  'ccNames',
] as const

export const PDF_LINE_FIELDS = [
  'sequence',
  'itemCode',
  'itemName',
  'quantityText',
  'unit',
  'moqNote',
  'unitPriceText',
  'discountText',
  'amountText',
  'imageDataUri',
  'components',
  'lineNotes',
] as const

// Compile-time guard: cost/margin/fx names must never enter any allowlist.
type Forbidden =
  | 'unitCost'
  | 'unit_cost'
  | 'costCurrency'
  | 'cost_currency'
  | 'fxRate'
  | 'fxRateCostToSelling'
  | 'lineCost'
  | 'lineMargin'
  | 'totalCost'
  | 'totalMargin'
  | 'margin'
type AssertNoCost<T extends readonly string[]> = Extract<T[number], Forbidden> extends never
  ? true
  : never
const _companyOk: AssertNoCost<typeof PDF_COMPANY_FIELDS> = true
const _quotationOk: AssertNoCost<typeof PDF_QUOTATION_FIELDS> = true
const _lineOk: AssertNoCost<typeof PDF_LINE_FIELDS> = true
void _companyOk
void _quotationOk
void _lineOk

// --- Input shapes (superset rows, as the data layer returns them) ----------

export interface CompanyRow {
  nameTh: string
  nameEn: string
  addressTh: string
  addressEn: string
  phone: string
  taxId?: string | null
  logoDataUri?: string | null
  footerTextTh?: string | null
  footerTextEn?: string | null
  termsText?: string | null
  [key: string]: unknown
}

export interface QuotationLineRow {
  sequence: number
  itemCode?: string | null
  itemName: string
  quantity: string
  unit?: string | null
  moqNote?: string | null
  unitPrice: string
  discountType?: 'amount' | 'percent' | null
  discountValue?: string | null
  amount: string
  imageDataUri?: string | null
  lineNotes?: string | null
  components?: { quantity: string; itemCode?: string | null; itemName: string }[]
  // Internal-only fields may be present on the row; the whitelist drops them.
  [key: string]: unknown
}

export interface QuotationRow {
  quotationNo: string | null
  revision: number
  quotationDate: string // ISO
  billToName?: string | null
  billToAddress?: string | null
  billToTaxId?: string | null
  billToBranch?: string | null
  validityText?: string | null
  deliveryDateText?: string | null
  paymentTermText?: string | null
  currency: string
  incoterm?: string | null
  countryOfOrigin?: string | null
  leadTimeText?: string | null
  remarks?: string | null
  whtNote?: string | null
  vatApplied: boolean
  vatRate: string
  subtotal: string
  discountTotal: string
  vatAmount: string
  grandTotal: string
  salespersonName?: string | null
  salespersonMobile?: string | null
  attentionName?: string | null
  attentionEmail?: string | null
  attentionPhone?: string | null
  ccNames?: string[]
  [key: string]: unknown
}

export interface QuotationWithLines {
  company: CompanyRow
  quotation: QuotationRow
  lines: QuotationLineRow[]
}

export interface PdfContext {
  company: Record<string, unknown>
  quotation: Record<string, unknown>
  lines: Record<string, unknown>[]
}

// --- Building --------------------------------------------------------------

function pick<T extends Record<string, unknown>>(
  source: T,
  fields: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (source[f] !== undefined) out[f] = source[f]
  }
  return out
}

const CURRENCY_LABELS: Record<string, string> = {
  THB: 'Thai Baht',
  USD: 'US Dollar',
  EUR: 'Euro',
}

/** `15/08/2026` — one enforced, unambiguous format (ADR-0031). */
export function formatQuotationDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function formatQuantity(quantity: string): string {
  return quantity.replace(/\.0*$|(\.\d*?)0+$/, '$1')
}

function formatVatRate(rate: string): string {
  return formatQuantity(rate) // "7.00" → "7"
}

function formatDiscount(type?: 'amount' | 'percent' | null, value?: string | null): string {
  if (!type || value == null) return '-' // samples print '-' when none
  if (type === 'percent') return `${formatQuantity(value)}%`
  return formatMoney(value)
}

/**
 * The single entry point. Returns plain UI-shaped objects, never database
 * rows, so a template referencing unit_cost has nothing to resolve.
 */
export function buildQuotationPdfContext(q: QuotationWithLines): PdfContext {
  const baseNo = q.quotation.quotationNo ?? 'DRAFT'
  // ADR-0046 B4: revisions are a suffix. Revision 1 is the original.
  const displayNo = q.quotation.revision > 1 ? `${baseNo}-R${q.quotation.revision}` : baseNo

  const quotationView: Record<string, unknown> = {
    ...q.quotation,
    quotationNo: displayNo,
    revisionLabel: q.quotation.revision > 1 ? `R${q.quotation.revision}` : null,
    dateText: formatQuotationDate(q.quotation.quotationDate),
    currencyLabel: CURRENCY_LABELS[q.quotation.currency] ?? q.quotation.currency,
    ccNames: q.quotation.ccNames ?? [],
    vatRateText: formatVatRate(q.quotation.vatRate),
    subtotalText: formatMoney(q.quotation.subtotal),
    discountTotalText:
      q.quotation.discountTotal !== '0.00' ? formatMoney(q.quotation.discountTotal) : null,
    vatText: formatMoney(q.quotation.vatAmount),
    grandTotalText: formatMoney(q.quotation.grandTotal),
  }

  const lines = [...q.lines]
    .sort((a, b) => a.sequence - b.sequence)
    .map((l) => {
      const view: Record<string, unknown> = {
        ...l,
        quantityText: formatQuantity(l.quantity),
        unit: l.unit ?? '',
        unitPriceText: formatMoney(l.unitPrice),
        discountText: formatDiscount(l.discountType, l.discountValue),
        amountText: formatMoney(l.amount),
        components: (l.components ?? []).map((c) => ({
          quantityText: formatQuantity(c.quantity),
          itemCode: c.itemCode ?? '',
          itemName: c.itemName,
        })),
      }
      return pick(view, PDF_LINE_FIELDS)
    })

  return {
    company: pick(q.company, PDF_COMPANY_FIELDS),
    quotation: pick(quotationView, PDF_QUOTATION_FIELDS),
    lines,
  }
}
