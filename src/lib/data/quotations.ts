// Data access for quotations. Assembles the whitelisted PDF payload via
// buildQuotationPdfContext — nothing else may feed the render service.
import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  company,
  people,
  quotationCc,
  quotationLineComponents,
  quotationLines,
  quotations,
} from '@/db/schema'
import {
  buildQuotationPdfContext,
  type PdfContext,
  type QuotationLineRow,
} from '@/lib/pdf/context'

export interface QuotationSummaryDto {
  id: number
  number: string
  revision: number
  status: 'draft' | 'issued' | 'superseded'
  date: string
  projectId: number
  currency: string
  grandTotal: string | null
}

export async function listQuotationsForProject(projectId: number): Promise<QuotationSummaryDto[]> {
  const rows = await db
    .select({
      id: quotations.id,
      number: quotations.number,
      revision: quotations.revision,
      status: quotations.status,
      date: quotations.date,
      projectId: quotations.projectId,
      currency: quotations.currency,
      grandTotal: quotations.grandTotal,
    })
    .from(quotations)
    .where(eq(quotations.projectId, projectId))
    .orderBy(desc(quotations.date), desc(quotations.id))
  return rows
}

async function fileToDataUri(relPath: string | null | undefined): Promise<string | null> {
  if (!relPath) return null
  const mediaRoot = path.resolve(process.env.MEDIA_ROOT ?? './media')
  const abs = path.resolve(mediaRoot, relPath)
  if (!abs.startsWith(mediaRoot + path.sep)) return null // no traversal
  try {
    const buf = await fs.readFile(abs)
    const ext = path.extname(abs).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Build the render-service payload for one quotation. Every field passes
 * through the whitelist in lib/pdf/context.ts; cost never leaves this module
 * because it is simply not selected into the view models.
 */
export async function buildPdfPayload(quotationId: number): Promise<PdfContext | null> {
  const qRows = await db.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1)
  const q = qRows[0]
  if (!q) return null

  const companyRows = await db.select().from(company).limit(1)
  const c = companyRows[0]
  if (!c) throw new Error('Company settings are not configured (admin → company)')

  const lineRows = await db
    .select()
    .from(quotationLines)
    .where(eq(quotationLines.quotationId, quotationId))
    .orderBy(asc(quotationLines.sequence))

  const lines: QuotationLineRow[] = await Promise.all(
    lineRows.map(async (l) => {
      const comps = await db
        .select()
        .from(quotationLineComponents)
        .where(eq(quotationLineComponents.lineId, l.id))
        .orderBy(asc(quotationLineComponents.sequence))
      return {
        sequence: l.sequence,
        itemCode: l.itemCode,
        itemName: l.itemName,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        discountType: l.discountType,
        discountValue: l.discountValue,
        amount: l.amount,
        imageDataUri: await fileToDataUri(l.imagePath),
        components: comps.map((cmp) => ({
          quantity: cmp.quantity,
          code: cmp.code,
          name: cmp.name,
        })),
      }
    }),
  )

  const cc = await db
    .select({ name: people.name })
    .from(quotationCc)
    .innerJoin(people, eq(quotationCc.personId, people.id))
    .where(eq(quotationCc.quotationId, quotationId))

  return buildQuotationPdfContext({
    company: {
      nameTh: c.nameTh,
      nameEn: c.nameEn,
      addressTh: c.addressTh,
      addressEn: c.addressEn,
      tel: c.tel,
      taxId: c.taxId,
      logoDataUri: await fileToDataUri(c.logoPath),
      thankYouTextTh: c.thankYouTextTh,
      thankYouTextEn: c.thankYouTextEn,
    },
    quotation: {
      number: q.number,
      revision: q.revision,
      date: q.date,
      validityText: q.validityText,
      deliveryDateText: q.deliveryDateText,
      paymentTermText: q.paymentTermText,
      leadTimeText: q.leadTimeText,
      regulatoryNote: q.regulatoryNote,
      currency: q.currency,
      incoterm: q.incoterm,
      countryOfOrigin: q.countryOfOrigin,
      vatApplied: q.vatApplied,
      billToName: q.billToName,
      billToAddress: q.billToAddress,
      billToTaxId: q.billToTaxId,
      billToTaxBranch: q.billToTaxBranch,
      attentionName: q.attentionName,
      attentionEmail: q.attentionEmail,
      attentionTel: q.attentionTel,
      ccNames: cc.map((p) => p.name),
      salespersonName: q.salespersonName,
      salespersonPhone: q.salespersonPhone,
      totalAmount: q.totalAmount,
      vatAmount: q.vatAmount,
      grandTotal: q.grandTotal,
    },
    lines,
  })
}
