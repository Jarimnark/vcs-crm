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
  upsertCompany,
} from '@/lib/data/admin'

export async function addPicklistItemAction(formData: FormData): Promise<void> {
  await requireSession()
  const kind = z.enum(PICKLIST_KINDS).parse(formData.get('kind'))
  const value = z.string().trim().min(1).max(200).parse(formData.get('value'))
  await addPicklistItem(kind, value)
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
  nameTh: z.string().trim().min(1).max(300),
  nameEn: z.string().trim().min(1).max(300),
  addressTh: z.string().trim().min(1).max(2000),
  addressEn: z.string().trim().min(1).max(2000),
  tel: z.string().trim().min(1).max(100),
  taxId: z.string().trim().max(50).nullable(),
  thankYouTextTh: z.string().trim().max(2000).nullable(),
  thankYouTextEn: z.string().trim().max(2000).nullable(),
})

export async function saveCompanyAction(formData: FormData): Promise<void> {
  await requireSession()
  const parsed = CompanySchema.parse({
    nameTh: formData.get('nameTh'),
    nameEn: formData.get('nameEn'),
    addressTh: formData.get('addressTh'),
    addressEn: formData.get('addressEn'),
    tel: formData.get('tel'),
    taxId: (formData.get('taxId') as string | null) || null,
    thankYouTextTh: (formData.get('thankYouTextTh') as string | null) || null,
    thankYouTextEn: (formData.get('thankYouTextEn') as string | null) || null,
  })
  await upsertCompany(parsed)
  revalidatePath('/admin/company')
}

export async function addNoteSnippetAction(formData: FormData): Promise<void> {
  await requireSession()
  const title = z.string().trim().min(1).max(200).parse(formData.get('title'))
  const body = z.string().trim().min(1).max(5000).parse(formData.get('body'))
  await addNoteSnippet(title, body)
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
