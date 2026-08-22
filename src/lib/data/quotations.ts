// Data access for quotations (02 §6). Assembles the whitelisted PDF payload
// via buildQuotationPdfContext — nothing else may feed the render service.
import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { asc, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import {
  company,
  people,
  picklists,
  quotationCc,
  quotationComponents,
  quotationLines,
  quotations,
  users,
  type QuotationStatus,
} from '@/db/schema'
import {
  buildQuotationPdfContext,
  type PdfContext,
  type QuotationLineRow,
} from '@/lib/pdf/context'

export interface QuotationSummaryDto {
  id: number
  quotationNo: string | null
  revision: number
  status: QuotationStatus
  quotationDate: string
  projectId: number
  currency: string
  grandTotal: string
}

export async function listQuotationsForProject(projectId: number): Promise<QuotationSummaryDto[]> {
  return db
    .select({
      id: quotations.id,
      quotationNo: quotations.quotationNo,
      revision: quotations.revision,
      status: quotations.status,
      quotationDate: quotations.quotationDate,
      projectId: quotations.projectId,
      currency: quotations.currency,
      grandTotal: quotations.grandTotal,
    })
    .from(quotations)
    .where(eq(quotations.projectId, projectId))
    .orderBy(desc(quotations.quotationDate), desc(quotations.id))
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
 * through the whitelist in lib/pdf/context.ts; cost never leaves this
 * module because it is simply not selected into the view models.
 */
export async function buildPdfPayload(quotationId: number): Promise<PdfContext | null> {
  const incotermPick = alias(picklists, 'incoterm_pick')
  const countryPick = alias(picklists, 'country_pick')

  const qRows = await db
    .select({
      q: quotations,
      incotermLabel: incotermPick.label,
      countryLabel: countryPick.label,
      salespersonName: users.name,
      salespersonMobile: users.phoneMobile,
      attentionName: people.name,
      attentionEmail: people.email,
      attentionPhone: people.mobile,
      attentionPhoneAlt: people.phone,
    })
    .from(quotations)
    .leftJoin(incotermPick, eq(quotations.incotermId, incotermPick.id))
    .leftJoin(countryPick, eq(quotations.countryOfOriginId, countryPick.id))
    .leftJoin(users, eq(quotations.salespersonUserId, users.id))
    .leftJoin(people, eq(quotations.attentionPersonId, people.id))
    .where(eq(quotations.id, quotationId))
    .limit(1)
  const row = qRows[0]
  if (!row) return null
  const q = row.q

  const companyRows = await db.select().from(company).limit(1)
  const c = companyRows[0]
  if (!c) throw new Error('Company settings are not configured (Admin → Company)')

  const unitPick = alias(picklists, 'unit_pick')
  const lineRows = await db
    .select({ line: quotationLines, unitLabel: unitPick.label })
    .from(quotationLines)
    .leftJoin(unitPick, eq(quotationLines.unitId, unitPick.id))
    .where(eq(quotationLines.quotationId, quotationId))
    .orderBy(asc(quotationLines.sequence))

  const lines: QuotationLineRow[] = await Promise.all(
    lineRows.map(async ({ line: l, unitLabel }) => {
      const comps = await db
        .select()
        .from(quotationComponents)
        .where(eq(quotationComponents.quotationLineId, l.id))
        .orderBy(asc(quotationComponents.sequence))
      return {
        sequence: l.sequence,
        itemCode: l.itemCode,
        itemName: l.itemName,
        quantity: l.quantity,
        unit: unitLabel,
        moqNote: l.moqNote,
        unitPrice: l.unitPrice,
        discountType: l.discountType,
        discountValue: l.discountValue,
        amount: l.amount,
        lineNotes: l.lineNotes,
        imageDataUri: await fileToDataUri(l.image),
        components: comps.map((cmp) => ({
          quantity: cmp.quantity,
          itemCode: cmp.itemCode,
          itemName: cmp.itemName,
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
      phone: c.phone,
      taxId: c.taxId,
      logoDataUri: await fileToDataUri(c.logo),
      footerTextTh: c.quotationFooterTextTh,
      footerTextEn: c.quotationFooterTextEn,
      termsText: c.quotationTermsText, // the T&C page (ADR-0046 B2)
    },
    quotation: {
      quotationNo: q.quotationNo,
      revision: q.revision,
      quotationDate: q.quotationDate,
      billToName: q.billToName,
      billToAddress: q.billToAddress,
      billToTaxId: q.billToTaxId,
      billToBranch: q.billToBranch,
      validityText: q.validityText,
      deliveryDateText: q.deliveryDateText,
      paymentTermText: q.paymentTermText,
      currency: q.currency,
      incoterm: row.incotermLabel,
      countryOfOrigin: row.countryLabel,
      leadTimeText: q.leadTimeText,
      remarks: q.remarks,
      whtNote: q.whtNote,
      vatApplied: q.vatApplied,
      vatRate: q.vatRate,
      subtotal: q.subtotal,
      discountTotal: q.discountTotal,
      vatAmount: q.vatAmount,
      grandTotal: q.grandTotal,
      salespersonName: row.salespersonName,
      salespersonMobile: row.salespersonMobile,
      attentionName: row.attentionName,
      attentionEmail: row.attentionEmail,
      attentionPhone: row.attentionPhone ?? row.attentionPhoneAlt,
      ccNames: cc.map((p) => p.name),
    },
    lines,
  })
}
