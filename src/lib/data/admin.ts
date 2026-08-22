// Data access for the four hand-built admin screens (docs/03 §7.2):
// picklists (six kinds — lost_reason dropped, ADR-0046 B9), company
// settings (including the quotation counter, ADR-0047), note snippets,
// users. Callers authenticate first (G1).
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  company,
  noteSnippets,
  picklists,
  users,
  type PicklistKind,
  type SnippetCategory,
  type UserRole,
} from '@/db/schema'
import { setNextQuotationNumber } from '@/lib/quotations/numbering'

export const PICKLIST_KINDS = [
  'incoterm',
  'unit',
  'country',
  'document_type',
  'task_type',
  'lead_source',
] as const satisfies readonly PicklistKind[]

export interface PicklistItemDto {
  id: number
  kind: PicklistKind
  code: string
  label: string
  sortOrder: number
  isActive: boolean
}

export async function listPicklist(kind: PicklistKind): Promise<PicklistItemDto[]> {
  return db
    .select()
    .from(picklists)
    .where(eq(picklists.kind, kind))
    .orderBy(asc(picklists.sortOrder), asc(picklists.label))
}

export async function addPicklistItem(
  kind: PicklistKind,
  code: string,
  label: string,
): Promise<void> {
  await db.insert(picklists).values({ kind, code, label }).onConflictDoNothing()
}

export async function setPicklistItemActive(id: number, isActive: boolean): Promise<void> {
  await db.update(picklists).set({ isActive }).where(eq(picklists.id, id))
}

export interface CompanyDto {
  nameTh: string
  nameEn: string
  addressTh: string
  addressEn: string
  phone: string
  taxId: string | null
  quotationFooterTextTh: string | null
  quotationFooterTextEn: string | null
  quotationTermsText: string | null
  defaultVatRate: string
  quotationNumberPrefix: string
  quotationNumberNext: number
  dateFormat: string
}

export async function getCompany(): Promise<CompanyDto | null> {
  const rows = await db.select().from(company).limit(1)
  if (!rows[0]) return null
  const r = rows[0]
  return {
    nameTh: r.nameTh,
    nameEn: r.nameEn,
    addressTh: r.addressTh,
    addressEn: r.addressEn,
    phone: r.phone,
    taxId: r.taxId,
    quotationFooterTextTh: r.quotationFooterTextTh,
    quotationFooterTextEn: r.quotationFooterTextEn,
    quotationTermsText: r.quotationTermsText,
    defaultVatRate: r.defaultVatRate,
    quotationNumberPrefix: r.quotationNumberPrefix,
    quotationNumberNext: r.quotationNumberNext,
    dateFormat: r.dateFormat,
  }
}

export async function updateCompany(
  input: Omit<CompanyDto, 'quotationNumberNext' | 'quotationNumberPrefix'>,
): Promise<void> {
  await db
    .update(company)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(company.id, 1))
}

/**
 * ADR-0047: the "next quotation number" admin control — forward-only. The
 * "700XX next year" case is one edit here each January.
 */
export async function updateNextQuotationNumber(next: number): Promise<void> {
  await setNextQuotationNumber(db, next)
}

export interface NoteSnippetDto {
  id: number
  title: string
  category: SnippetCategory
  body: string
  isActive: boolean
}

export async function listNoteSnippets(): Promise<NoteSnippetDto[]> {
  const rows = await db.select().from(noteSnippets).orderBy(asc(noteSnippets.title))
  return rows.map(({ id, title, category, body, isActive }) => ({
    id,
    title,
    category,
    body,
    isActive,
  }))
}

export async function addNoteSnippet(
  title: string,
  category: SnippetCategory,
  body: string,
): Promise<void> {
  await db.insert(noteSnippets).values({ title, category, body })
}

export interface UserDto {
  id: string
  name: string
  email: string
  role: UserRole
  phoneMobile: string | null
  active: boolean
}

export async function listUsers(): Promise<UserDto[]> {
  const rows = await db.select().from(users).orderBy(asc(users.name))
  return rows.map(({ id, name, email, role, phoneMobile, active }) => ({
    id,
    name,
    email,
    role,
    phoneMobile,
    active,
  }))
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  await db.update(users).set({ active, updatedAt: new Date() }).where(eq(users.id, id))
}

export async function setUserRole(id: string, role: UserRole): Promise<void> {
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id))
}
