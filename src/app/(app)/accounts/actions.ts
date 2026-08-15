'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createAccount } from '@/lib/data/accounts'
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
