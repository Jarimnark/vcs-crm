'use server'

// Admin actions. Flat permissions (ADR-0006) — any authenticated user may
// manage reference data in Phase 1; user management is manager-only.
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession, isManager } from '@/lib/session'
import {
  addNoteSnippet,
  addPicklistItem,
  PICKLIST_KINDS,
  setPicklistItemActive,
  setUserActive,
  setUserRole,
  updateCompany,
  updateNextQuotationNumber,
} from '@/lib/data/admin'

export async function addPicklistItemAction(formData: FormData): Promise<void> {
  await requireSession()
  const kind = z.enum(PICKLIST_KINDS).parse(formData.get('kind'))
  const label = z.string().trim().min(1).max(255).parse(formData.get('label'))
  const codeRaw = ((formData.get('code') as string | null) || '').trim()
  const code = codeRaw !== '' ? codeRaw.slice(0, 50) : label.slice(0, 50)
  await addPicklistItem(kind, code, label)
  revalidatePath('/admin/picklists')
}

export async function setPicklistActiveAction(formData: FormData): Promise<void> {
  await requireSession()
  const id = z.coerce.number().int().positive().parse(formData.get('id'))
  const active = formData.get('active') === 'true'
  await setPicklistItemActive(id, active)
  revalidatePath('/admin/picklists')
}

const CompanySchema = z.object({
  nameTh: z.string().trim().min(1).max(255),
  nameEn: z.string().trim().min(1).max(255),
  addressTh: z.string().trim().min(1).max(2000),
  addressEn: z.string().trim().min(1).max(2000),
  phone: z.string().trim().min(1).max(50),
  taxId: z.string().trim().max(20).nullable(),
  quotationFooterTextTh: z.string().trim().max(2000).nullable(),
  quotationFooterTextEn: z.string().trim().max(2000).nullable(),
  quotationTermsText: z.string().trim().max(20000).nullable(),
  defaultVatRate: z.string().trim().regex(/^\d{1,2}(\.\d{1,2})?$/),
  dateFormat: z.string().trim().min(1).max(20),
})

export async function saveCompanyAction(formData: FormData): Promise<void> {
  await requireSession()
  const parsed = CompanySchema.parse({
    nameTh: formData.get('nameTh'),
    nameEn: formData.get('nameEn'),
    addressTh: formData.get('addressTh'),
    addressEn: formData.get('addressEn'),
    phone: formData.get('phone'),
    taxId: (formData.get('taxId') as string | null) || null,
    quotationFooterTextTh: (formData.get('quotationFooterTextTh') as string | null) || null,
    quotationFooterTextEn: (formData.get('quotationFooterTextEn') as string | null) || null,
    quotationTermsText: (formData.get('quotationTermsText') as string | null) || null,
    defaultVatRate: formData.get('defaultVatRate'),
    dateFormat: formData.get('dateFormat'),
  })
  await updateCompany(parsed)
  revalidatePath('/admin/company')
}

/** ADR-0047: forward-only. Manager-only — this moves a customer-visible sequence. */
export async function setNextQuotationNumberAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  if (!isManager(session)) throw new Error('Manager role required')
  const next = z.coerce.number().int().positive().parse(formData.get('next'))
  await updateNextQuotationNumber(next)
  revalidatePath('/admin/company')
}

export async function addNoteSnippetAction(formData: FormData): Promise<void> {
  await requireSession()
  const title = z.string().trim().min(1).max(255).parse(formData.get('title'))
  const category = z
    .enum(['lead_time', 'regulatory', 'terms', 'other'])
    .parse(formData.get('category'))
  const body = z.string().trim().min(1).max(10000).parse(formData.get('body'))
  await addNoteSnippet(title, category, body)
  revalidatePath('/admin/snippets')
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  if (!isManager(session)) throw new Error('Manager role required')
  const id = z.string().min(1).parse(formData.get('id'))
  if (id === session.userId) throw new Error('You cannot deactivate yourself')
  const active = formData.get('active') === 'true'
  await setUserActive(id, active)
  revalidatePath('/admin/users')
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  if (!isManager(session)) throw new Error('Manager role required')
  const id = z.string().min(1).parse(formData.get('id'))
  const role = z.enum(['ceo', 'finance', 'sales_engineer', 'sales_manager']).parse(formData.get('role'))
  await setUserRole(id, role)
  revalidatePath('/admin/users')
}
