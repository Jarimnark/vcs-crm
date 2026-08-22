'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createAccount, createPerson } from '@/lib/data/accounts'
import { createProject } from '@/lib/data/projects'

const ACCOUNT_TYPES = ['client', 'supplier', 'manufacturer', 'service_provider', 'logistics'] as const

const NewAccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  types: z.array(z.enum(ACCOUNT_TYPES)).min(1),
  address: z.string().trim().max(2000).nullable(),
  industry: z.string().trim().max(100).nullable(),
  taxId: z.string().trim().max(20).nullable(),
  taxBranch: z.string().trim().max(100).nullable(),
})

export async function createAccountAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewAccountSchema.parse({
    name: formData.get('name'),
    // Multi-select (ADR-0034): an account plays as many roles as it plays.
    types: formData.getAll('types').filter((v) => v !== ''),
    address: (formData.get('address') as string | null) || null,
    industry: (formData.get('industry') as string | null) || null,
    taxId: (formData.get('taxId') as string | null) || null,
    taxBranch: (formData.get('taxBranch') as string | null) || null,
  })
  await createAccount({ ...parsed, createdById: session.userId })
  revalidatePath('/accounts')
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

export async function createPersonAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewPersonSchema.parse({
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
  await createPerson({ ...parsed, createdById: session.userId })
  revalidatePath(`/accounts/${parsed.accountId}`)
}

const NewProjectSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(255),
  type: z.enum(['consumable', 'equipment', 'part', 'service']),
  expectedAmount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable(),
})

export async function createProjectAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewProjectSchema.parse({
    accountId: formData.get('accountId'),
    name: formData.get('name'),
    type: formData.get('type'),
    expectedAmount: (formData.get('expectedAmount') as string | null) || null,
  })
  await createProject(session, parsed)
  revalidatePath(`/accounts/${parsed.accountId}`)
  revalidatePath('/projects')
}
