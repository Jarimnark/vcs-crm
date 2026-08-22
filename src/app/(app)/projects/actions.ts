'use server'

// Flow B: create a project from anywhere — pick an existing account or type
// a new account name and it is created inline (never block on missing
// reference data).
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createAccount } from '@/lib/data/accounts'
import { createProject } from '@/lib/data/projects'

const NewProjectSchema = z.object({
  accountId: z.coerce.number().int().positive().nullable(),
  newAccountName: z.string().trim().max(255).nullable(),
  name: z.string().trim().min(1).max(255),
  type: z.enum(['consumable', 'equipment', 'part', 'service']),
  expectedAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

export async function createProjectAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewProjectSchema.parse({
    accountId: (formData.get('accountId') as string | null) || null,
    newAccountName: (formData.get('newAccountName') as string | null) || null,
    name: formData.get('name'),
    type: formData.get('type'),
    expectedAmount: (formData.get('expectedAmount') as string | null) || null,
    expectedCloseDate: (formData.get('expectedCloseDate') as string | null) || null,
  })

  let accountId = parsed.accountId
  if (accountId == null) {
    if (!parsed.newAccountName) {
      throw new Error('Select an account or type a new account name')
    }
    accountId = await createAccount({ name: parsed.newAccountName, createdById: session.userId })
  }

  const id = await createProject(session, {
    accountId,
    name: parsed.name,
    type: parsed.type,
    expectedAmount: parsed.expectedAmount,
    expectedCloseDate: parsed.expectedCloseDate,
  })
  revalidatePath('/projects')
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/projects/${id}`)
}
