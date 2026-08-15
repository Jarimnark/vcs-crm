// Data access for the four hand-built admin screens
// (docs/03-tech-stack.md §7.2): picklists, company settings, note snippets,
// users. Admin actions must still authenticate — these are called from
// Server Actions that check the session first (G1).
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { company, noteSnippets, picklists, users, type picklistKind } from '@/db/schema'

export type PicklistKind = (typeof picklistKind.enumValues)[number]
export const PICKLIST_KINDS = [
  'incoterm',
  'unit',
  'country',
  'document_type',
  'task_type',
  'lead_source',
  'lost_reason',
] as const satisfies readonly PicklistKind[]

export interface PicklistItemDto {
  id: number
  kind: PicklistKind
  value: string
  sortOrder: number
  active: boolean
}

export async function listPicklist(kind: PicklistKind): Promise<PicklistItemDto[]> {
  return db
    .select()
    .from(picklists)
    .where(eq(picklists.kind, kind))
    .orderBy(asc(picklists.sortOrder), asc(picklists.value))
}

export async function addPicklistItem(kind: PicklistKind, value: string): Promise<void> {
  await db.insert(picklists).values({ kind, value }).onConflictDoNothing()
}

export async function setPicklistItemActive(id: number, active: boolean): Promise<void> {
  await db.update(picklists).set({ active }).where(eq(picklists.id, id))
}

export interface CompanyDto {
  nameTh: string
  nameEn: string
  addressTh: string
  addressEn: string
  tel: string
  taxId: string | null
  thankYouTextTh: string | null
  thankYouTextEn: string | null
}

export async function getCompany(): Promise<CompanyDto | null> {
  const rows = await db.select().from(company).limit(1)
  if (!rows[0]) return null
  const { nameTh, nameEn, addressTh, addressEn, tel, taxId, thankYouTextTh, thankYouTextEn } = rows[0]
  return { nameTh, nameEn, addressTh, addressEn, tel, taxId, thankYouTextTh, thankYouTextEn }
}

export async function upsertCompany(input: CompanyDto): Promise<void> {
  await db
    .insert(company)
    .values({ id: 1, ...input })
    .onConflictDoUpdate({ target: company.id, set: { ...input } })
}

export interface NoteSnippetDto {
  id: number
  title: string
  body: string
  active: boolean
}

export async function listNoteSnippets(): Promise<NoteSnippetDto[]> {
  const rows = await db.select().from(noteSnippets).orderBy(asc(noteSnippets.title))
  return rows.map(({ id, title, body, active }) => ({ id, title, body, active }))
}

export async function addNoteSnippet(title: string, body: string): Promise<void> {
  await db.insert(noteSnippets).values({ title, body })
}

export interface UserDto {
  id: string
  name: string
  email: string
  role: string
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
  await db.update(users).set({ active }).where(eq(users.id, id))
}
