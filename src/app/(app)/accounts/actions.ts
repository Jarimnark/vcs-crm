'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createAccount, createPerson, updateAccount, updatePerson } from '@/lib/data/accounts'

const ACCOUNT_TYPES = ['client', 'supplier', 'manufacturer', 'service_provider', 'logistics'] as const

const AccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  types: z.array(z.enum(ACCOUNT_TYPES)).min(1),
  status: z.enum(['active', 'inactive', 'prospect']),
  phone: z.string().trim().max(50).nullable(),
  address: z.string().trim().max(2000).nullable(),
  industry: z.string().trim().max(100).nullable(),
  taxId: z.string().trim().max(20).nullable(),
  taxBranch: z.string().trim().max(100).nullable(),
  defaultPaymentTerm: z.string().trim().max(255).nullable(),
})

function parseAccountForm(formData: FormData) {
  return AccountSchema.parse({
    name: formData.get('name'),
    // Multi-select (ADR-0034): an account plays as many roles as it plays.
    types: formData.getAll('types').filter((v) => v !== ''),
    status: formData.get('status') ?? 'active',
    phone: (formData.get('phone') as string | null) || null,
    address: (formData.get('address') as string | null) || null,
    industry: (formData.get('industry') as string | null) || null,
    taxId: (formData.get('taxId') as string | null) || null,
    taxBranch: (formData.get('taxBranch') as string | null) || null,
    defaultPaymentTerm: (formData.get('defaultPaymentTerm') as string | null) || null,
  })
}

export async function createAccountAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = parseAccountForm(formData)
  const id = await createAccount({ ...parsed, createdById: session.userId })
  revalidatePath('/accounts')
  redirect(`/accounts/${id}`)
}

export async function updateAccountAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const accountId = z.coerce.number().int().positive().parse(formData.get('accountId'))
  const parsed = parseAccountForm(formData)
  const ok = await updateAccount(accountId, { ...parsed, updatedById: session.userId })
  if (!ok) throw new Error('Account not found')
  revalidatePath('/accounts')
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}

const NewPersonSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(255),
  position: z.string().trim().max(255).nullable(),
  department: z.string().trim().max(255).nullable(),
  email: z.email().max(254).nullable(),
  phone: z.string().trim().max(50).nullable(),
  mobile: z.string().trim().max(50).nullable(),
  lineId: z.string().trim().max(100).nullable(),
  isPrimary: z.boolean(),
  decisionRole: z.enum(['technical', 'commercial', 'decision_maker']).nullable(),
})

function parsePersonForm(formData: FormData) {
  return NewPersonSchema.parse({
    accountId: formData.get('accountId'),
    name: formData.get('name'),
    position: (formData.get('position') as string | null) || null,
    department: (formData.get('department') as string | null) || null,
    email: (formData.get('email') as string | null) || null,
    phone: (formData.get('phone') as string | null) || null,
    mobile: (formData.get('mobile') as string | null) || null,
    lineId: (formData.get('lineId') as string | null) || null,
    isPrimary: formData.get('isPrimary') === 'on',
    decisionRole: (formData.get('decisionRole') as string | null) || null,
  })
}

export async function createPersonAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = parsePersonForm(formData)
  await createPerson({ ...parsed, createdById: session.userId })
  revalidatePath(`/accounts/${parsed.accountId}`)
}

export async function updatePersonAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const personId = z.coerce.number().int().positive().parse(formData.get('personId'))
  const parsed = parsePersonForm(formData)
  const ok = await updatePerson(personId, { ...parsed, updatedById: session.userId })
  if (!ok) throw new Error('Contact not found')
  revalidatePath(`/accounts/${parsed.accountId}`)
  redirect(`/accounts/${parsed.accountId}`)
}
