'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createExpense, updateExpense } from '@/lib/data/expenses'

const NewExpenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(['travel', 'fuel', 'accommodation', 'entertainment', 'other']),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  note: z.string().trim().max(255).nullable(),
})

export async function createExpenseAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewExpenseSchema.parse({
    expenseDate: formData.get('expenseDate'),
    category: formData.get('category'),
    amount: formData.get('amount'),
    note: (formData.get('note') as string | null) || null,
  })
  // incurredByUserId is always the session user — never client-supplied (G1).
  await createExpense(session, parsed)
  revalidatePath('/expenses')
}

export async function updateExpenseAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const expenseId = z.coerce.number().int().positive().parse(formData.get('expenseId'))
  const parsed = NewExpenseSchema.parse({
    expenseDate: formData.get('expenseDate'),
    category: formData.get('category'),
    amount: formData.get('amount'),
    note: (formData.get('note') as string | null) || null,
  })
  // Owner-scoped in the DAL query — out of scope returns null, not forbidden.
  const updated = await updateExpense(session, expenseId, parsed)
  if (!updated) throw new Error('Expense not found')
  revalidatePath('/expenses')
  redirect('/expenses')
}
