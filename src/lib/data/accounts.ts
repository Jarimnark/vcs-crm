// Data access for accounts and people (02 §4). DTOs only (G2).
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  accounts,
  people,
  type AccountStatus,
  type AccountType,
  type DecisionRole,
} from '@/db/schema'

export interface AccountDto {
  id: number
  name: string
  types: AccountType[]
  status: AccountStatus
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

export async function listAccounts(): Promise<AccountDto[]> {
  const rows = await db.select().from(accounts).orderBy(asc(accounts.name))
  return rows.map(toAccountDto)
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

export async function createAccount(input: {
  name: string
  types?: AccountType[]
  address?: string | null
  industry?: string | null
  taxId?: string | null
  taxBranch?: string | null
  defaultPaymentTerm?: string | null
  createdById: string
}): Promise<number> {
  const rows = await db
    .insert(accounts)
    .values({
      name: input.name,
      types: input.types?.length ? input.types : ['client'],
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
