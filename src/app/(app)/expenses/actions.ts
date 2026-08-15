'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createExpense } from '@/lib/data/expenses'

const NewExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  category: z.string().trim().max(100).nullable(),
  note: z.string().trim().max(1000).nullable(),
})

export async function createExpenseAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewExpenseSchema.parse({
    date: formData.get('date'),
    amount: formData.get('amount'),
    category: (formData.get('category') as string | null) || null,
    note: (formData.get('note') as string | null) || null,
  })
  // incurredByUserId is always the session user — never client-supplied (G1).
  await createExpense(session, parsed)
  revalidatePath('/expenses')
}
