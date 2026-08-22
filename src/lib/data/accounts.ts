// Data access for accounts and people (02 §4). DTOs only (G2).
import 'server-only'
import { and, asc, count, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  accounts,
  people,
  type AccountStatus,
  type AccountType,
  type DecisionRole,
} from '@/db/schema'
import { likePattern, offsetFor, PAGE_SIZE, paged, type Paged } from '@/lib/list'

export interface AccountDto {
  id: number
  name: string
  types: AccountType[]
  status: AccountStatus
  phone: string | null
  address: string | null
  industry: string | null
  taxId: string | null
  taxBranch: string | null
  defaultCurrency: string
  defaultPaymentTerm: string | null
  ownerUserId: string | null
}

export interface PersonDto {
  id: number
  accountId: number
  name: string
  position: string | null
  department: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  lineId: string | null
  isPrimary: boolean
  decisionRole: DecisionRole | null
}

function toAccountDto(row: typeof accounts.$inferSelect): AccountDto {
  return {
    id: row.id,
    name: row.name,
    types: row.types,
    status: row.status,
    phone: row.phone,
    address: row.address,
    industry: row.industry,
    taxId: row.taxId,
    taxBranch: row.taxBranch,
    defaultCurrency: row.defaultCurrency,
    defaultPaymentTerm: row.defaultPaymentTerm,
    ownerUserId: row.ownerUserId,
  }
}

function toPersonDto(row: typeof people.$inferSelect): PersonDto {
  return {
    id: row.id,
    accountId: row.accountId,
    name: row.name,
    position: row.position,
    department: row.department,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    lineId: row.lineId,
    isPrimary: row.isPrimary,
    decisionRole: row.decisionRole,
  }
}

export interface AccountFilters {
  q?: string
  type?: AccountType
  status?: AccountStatus
  page?: number
}

export async function listAccounts(f: AccountFilters = {}): Promise<Paged<AccountDto>> {
  const page = f.page ?? 1
  const conditions: SQL[] = []
  if (f.q) {
    const p = likePattern(f.q)
    conditions.push(or(ilike(accounts.name, p), ilike(accounts.taxId, p))!)
  }
  if (f.type) conditions.push(sql`${accounts.types} @> ARRAY[${f.type}]::text[]`)
  if (f.status) conditions.push(eq(accounts.status, f.status))
  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(accounts)
    .where(where)
    .orderBy(asc(accounts.name))
    .limit(PAGE_SIZE)
    .offset(offsetFor(page))
  const total = await db.select({ n: count() }).from(accounts).where(where)
  return paged(rows.map(toAccountDto), total[0].n, page)
}

export async function getAccount(id: number): Promise<AccountDto | null> {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
  return rows[0] ? toAccountDto(rows[0]) : null
}

export async function listPeople(accountId: number): Promise<PersonDto[]> {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.accountId, accountId))
    .orderBy(asc(people.name))
  return rows.map(toPersonDto)
}

export interface AccountInput {
  name: string
  types?: AccountType[]
  status?: AccountStatus
  phone?: string | null
  address?: string | null
  industry?: string | null
  taxId?: string | null
  taxBranch?: string | null
  defaultPaymentTerm?: string | null
}

export async function createAccount(input: AccountInput & { createdById: string }): Promise<number> {
  const rows = await db
    .insert(accounts)
    .values({
      name: input.name,
      types: input.types?.length ? input.types : ['client'],
      status: input.status ?? 'active',
      phone: input.phone ?? null,
      address: input.address ?? null,
      industry: input.industry ?? null,
      taxId: input.taxId ?? null,
      taxBranch: input.taxBranch ?? null,
      defaultPaymentTerm: input.defaultPaymentTerm ?? null,
      ownerUserId: input.createdById,
      createdById: input.createdById,
      updatedById: input.createdById,
    })
    .returning({ id: accounts.id })
  return rows[0].id
}

export async function updateAccount(
  id: number,
  input: AccountInput & { updatedById: string },
): Promise<boolean> {
  const rows = await db
    .update(accounts)
    .set({
      name: input.name,
      types: input.types?.length ? input.types : ['client'],
      status: input.status ?? 'active',
      phone: input.phone ?? null,
      address: input.address ?? null,
      industry: input.industry ?? null,
      taxId: input.taxId ?? null,
      taxBranch: input.taxBranch ?? null,
      defaultPaymentTerm: input.defaultPaymentTerm ?? null,
      updatedById: input.updatedById,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id))
    .returning({ id: accounts.id })
  return rows.length > 0
}

export async function getPerson(id: number): Promise<PersonDto | null> {
  const rows = await db.select().from(people).where(eq(people.id, id)).limit(1)
  return rows[0] ? toPersonDto(rows[0]) : null
}

export interface PersonInput {
  name: string
  position?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  lineId?: string | null
  isPrimary?: boolean
  decisionRole?: DecisionRole | null
}

export async function updatePerson(
  id: number,
  input: PersonInput & { updatedById: string },
): Promise<boolean> {
  const rows = await db
    .update(people)
    .set({
      name: input.name,
      position: input.position ?? null,
      department: input.department ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      mobile: input.mobile ?? null,
      lineId: input.lineId ?? null,
      isPrimary: input.isPrimary ?? false,
      decisionRole: input.decisionRole ?? null,
      updatedById: input.updatedById,
      updatedAt: new Date(),
    })
    .where(eq(people.id, id))
    .returning({ id: people.id })
  return rows.length > 0
}

export async function createPerson(input: {
  accountId: number
  name: string
  position?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  lineId?: string | null
  isPrimary?: boolean
  decisionRole?: DecisionRole | null
  createdById: string
}): Promise<number> {
  const rows = await db
    .insert(people)
    .values({
      accountId: input.accountId,
      name: input.name,
      position: input.position ?? null,
      department: input.department ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      mobile: input.mobile ?? null,
      lineId: input.lineId ?? null,
      isPrimary: input.isPrimary ?? false,
      decisionRole: input.decisionRole ?? null,
      createdById: input.createdById,
      updatedById: input.createdById,
    })
    .returning({ id: people.id })
  return rows[0].id
}
