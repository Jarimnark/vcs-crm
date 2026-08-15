// The cost-leak whitelist — the ONLY path from data to the PDF render service
// (docs/03-tech-stack.md §4.2, ADR-0031).
//
// The client calls a cost column on a client-facing quotation "a serious
// commercial problem" and specifies the mitigation: print from an approved
// field whitelist, not by hiding columns. The context is built from explicit
// allowlists, so cost fields are never in the payload — a template referencing
// unit_cost has nothing to resolve. The failure mode is "renders blank",
// not "leaks silently".
//
// The sentinel test (tests/pdf-context.test.ts and the CI integration test)
// is the actual guarantee. Adding a field here means deliberately extending
// a whitelist, and the field names below must never include cost or margin.
import { formatMoney } from '@/lib/money'

// --- Allowlists ------------------------------------------------------------

export const PDF_COMPANY_FIELDS = [
  'nameTh',
  'nameEn',
  'addressTh',
  'addressEn',
  'tel',
  'taxId',
  'logoDataUri',
  'thankYouTextTh',
  'thankYouTextEn',
] as const

export const PDF_QUOTATION_FIELDS = [
  'number',
  'revisionLabel',
  'dateText',
  'validityText',
  'deliveryDateText',
  'paymentTermText',
  'leadTimeText',
  'regulatoryNote',
  'currency',
  'currencyLabel',
  'incoterm',
  'countryOfOrigin',
  'vatApplied',
  'billToName',
  'billToAddress',
  'billToTaxId',
  'billToTaxBranch',
  'attentionName',
  'attentionEmail',
  'attentionTel',
  'ccNames',
  'salespersonName',
  'salespersonPhone',
  'totalText',
  'vatText',
  'grandTotalText',
] as const

export const PDF_LINE_FIELDS = [
  'sequence',
  'itemCode',
  'itemName',
  'description',
  'quantityText',
  'unit',
  'unitPriceText',
  'discountText',
  'amountText',
  'imageDataUri',
  'components',
] as const

// Compile-time guard: these names must never appear in any allowlist.
type Forbidden = 'unitCost' | 'unit_cost' | 'costCurrency' | 'cost_currency' | 'fxRate' | 'margin'
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
  tel: string
  taxId?: string | null
  logoDataUri?: string | null
  thankYouTextTh?: string | null
  thankYouTextEn?: string | null
  [key: string]: unknown
}

export interface QuotationLineRow {
  sequence: number
  itemCode?: string | null
  itemName: string
  description?: string | null
  quantity: string
  unit: string
  unitPrice: string
  discountType?: 'amount' | 'percent' | null
  discountValue?: string | null
  amount: string
  imageDataUri?: string | null
  components?: { quantity: string; code?: string | null; name: string }[]
  // Internal-only fields may be present on the row; the whitelist drops them.
  [key: string]: unknown
}

export interface QuotationRow {
  number: string
  revision: number
  date: string // ISO
  validityText?: string | null
  deliveryDateText?: string | null
  paymentTermText?: string | null
  leadTimeText?: string | null
  regulatoryNote?: string | null
  currency: string
  incoterm?: string | null
  countryOfOrigin?: string | null
  vatApplied: boolean
  billToName?: string | null
  billToAddress?: string | null
  billToTaxId?: string | null
  billToTaxBranch?: string | null
  attentionName?: string | null
  attentionEmail?: string | null
  attentionTel?: string | null
  ccNames?: string[]
  salespersonName?: string | null
  salespersonPhone?: string | null
  totalAmount?: string | null
  vatAmount?: string | null
  grandTotal?: string | null
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

/** `15/07/2026` — one enforced, unambiguous format (ADR-0031). */
export function formatQuotationDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/**
 * The single entry point. Returns plain UI-shaped objects, never database
 * rows, so a template referencing unit_cost has nothing to resolve.
 */
export function buildQuotationPdfContext(q: QuotationWithLines): PdfContext {
  const displayNumber =
    q.quotation.revision > 0 ? `${q.quotation.number}-R${q.quotation.revision}` : q.quotation.number

  const quotationView: Record<string, unknown> = {
    ...q.quotation,
    number: displayNumber,
    revisionLabel: q.quotation.revision > 0 ? `R${q.quotation.revision}` : null,
    dateText: formatQuotationDate(q.quotation.date),
    currencyLabel: CURRENCY_LABELS[q.quotation.currency] ?? q.quotation.currency,
    ccNames: q.quotation.ccNames ?? [],
    totalText: q.quotation.totalAmount != null ? formatMoney(q.quotation.totalAmount) : null,
    vatText: q.quotation.vatAmount != null ? formatMoney(q.quotation.vatAmount) : null,
    grandTotalText: q.quotation.grandTotal != null ? formatMoney(q.quotation.grandTotal) : null,
  }

  const lines = [...q.lines]
    .sort((a, b) => a.sequence - b.sequence)
    .map((l) => {
      const view: Record<string, unknown> = {
        ...l,
        quantityText: formatQuantity(l.quantity),
        unitPriceText: formatMoney(l.unitPrice),
        // Prints '-' when there is no discount, per the samples.
        discountText: formatDiscount(l.discountType, l.discountValue),
        amountText: formatMoney(l.amount),
        components: (l.components ?? []).map((c) => ({
          quantityText: formatQuantity(c.quantity),
          code: c.code ?? '',
          name: c.name,
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

function formatQuantity(quantity: string): string {
  // NUMERIC(15,3) string → trim trailing zeros: "13.000" → "13"
  return quantity.replace(/\.0*$|(\.\d*?)0+$/, '$1')
}

function formatDiscount(
  type?: 'amount' | 'percent' | null,
  value?: string | null,
): string {
  if (!type || value == null) return '-'
  if (type === 'percent') return `${formatQuantity(value)}%`
  return formatMoney(value)
}
