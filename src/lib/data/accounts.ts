// Data access for accounts and people. DTOs only (G2) — pass fields onward,
// never raw rows.
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { accounts, people } from '@/db/schema'

export interface AccountDto {
  id: number
  name: string
  type: 'customer' | 'principal' | 'partner' | 'other'
  address: string | null
  taxId: string | null
  taxBranch: string | null
  defaultCurrency: string
}

export interface PersonDto {
  id: number
  accountId: number
  name: string
  position: string | null
  email: string | null
  tel: string | null
  mobile: string | null
}

export async function listAccounts(): Promise<AccountDto[]> {
  const rows = await db.select().from(accounts).orderBy(asc(accounts.name))
  return rows.map(({ id, name, type, address, taxId, taxBranch, defaultCurrency }) => ({
    id,
    name,
    type,
    address,
    taxId,
    taxBranch,
    defaultCurrency,
  }))
}

export async function getAccount(id: number): Promise<AccountDto | null> {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
  if (!rows[0]) return null
  const { name, type, address, taxId, taxBranch, defaultCurrency } = rows[0]
  return { id, name, type, address, taxId, taxBranch, defaultCurrency }
}

export async function listPeople(accountId: number): Promise<PersonDto[]> {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.accountId, accountId))
    .orderBy(asc(people.name))
  return rows.map(({ id, accountId: aid, name, position, email, tel, mobile }) => ({
    id,
    accountId: aid,
    name,
    position,
    email,
    tel,
    mobile,
  }))
}

export async function createPerson(input: {
  accountId: number
  name: string
  position?: string | null
  email?: string | null
  tel?: string | null
  mobile?: string | null
}): Promise<number> {
  const rows = await db
    .insert(people)
    .values({
      accountId: input.accountId,
      name: input.name,
      position: input.position ?? null,
      email: input.email ?? null,
      tel: input.tel ?? null,
      mobile: input.mobile ?? null,
    })
    .returning({ id: people.id })
  return rows[0].id
}

export async function createAccount(input: {
  name: string
  type?: AccountDto['type']
  address?: string | null
  taxId?: string | null
  taxBranch?: string | null
  createdById: string
}): Promise<number> {
  const rows = await db
    .insert(accounts)
    .values({
      name: input.name,
      type: input.type ?? 'customer',
      address: input.address ?? null,
      taxId: input.taxId ?? null,
      taxBranch: input.taxBranch ?? null,
      createdById: input.createdById,
    })
    .returning({ id: accounts.id })
  return rows[0].id
}
