'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createAccount, createPerson } from '@/lib/data/accounts'
import { createProject } from '@/lib/data/projects'

const NewAccountSchema = z.object({
  name: z.string().trim().min(1).max(300),
  type: z.enum(['customer', 'principal', 'partner', 'other']),
  address: z.string().trim().max(2000).nullable(),
  taxId: z.string().trim().max(50).nullable(),
  taxBranch: z.string().trim().max(100).nullable(),
})

export async function createAccountAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewAccountSchema.parse({
    name: formData.get('name'),
    type: formData.get('type'),
    address: (formData.get('address') as string | null) || null,
    taxId: (formData.get('taxId') as string | null) || null,
    taxBranch: (formData.get('taxBranch') as string | null) || null,
  })
  await createAccount({ ...parsed, createdById: session.userId })
  revalidatePath('/accounts')
}

const NewPersonSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  position: z.string().trim().max(200).nullable(),
  email: z.string().trim().email().max(320).nullable(),
  tel: z.string().trim().max(50).nullable(),
  mobile: z.string().trim().max(50).nullable(),
})

export async function createPersonAction(formData: FormData): Promise<void> {
  await requireSession()
  const parsed = NewPersonSchema.parse({
    accountId: formData.get('accountId'),
    name: formData.get('name'),
    position: (formData.get('position') as string | null) || null,
    email: (formData.get('email') as string | null) || null,
    tel: (formData.get('tel') as string | null) || null,
    mobile: (formData.get('mobile') as string | null) || null,
  })
  await createPerson(parsed)
  revalidatePath(`/accounts/${parsed.accountId}`)
}

const NewProjectSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(300),
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
