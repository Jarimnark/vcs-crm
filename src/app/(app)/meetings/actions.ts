'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createMeeting } from '@/lib/data/meetings'
import { createExpense } from '@/lib/data/expenses'

const NewMeetingSchema = z.object({
  title: z.string().trim().min(1).max(255),
  accountId: z.coerce.number().int().positive().nullable(),
  status: z.enum(['planned', 'completed', 'cancelled', 'no_show']),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  durationHours: z.string().trim().regex(/^\d{1,2}(\.\d{1,2})?$/).nullable(),
  mode: z.enum(['client_site', 'office', 'online', 'phone']),
  location: z.string().trim().max(255).nullable(),
  agenda: z.string().trim().max(5000).nullable(),
  outcomeNotes: z.string().trim().max(5000).nullable(),
  projectIds: z.array(z.coerce.number().int().positive()),
  attendeePersonIds: z.array(z.coerce.number().int().positive()),
  // Flow G: the optional expense captured while the receipt is still in hand
  expenseAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  expenseCategory: z.enum(['travel', 'fuel', 'accommodation', 'entertainment', 'other']).nullable(),
})

export async function createMeetingAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewMeetingSchema.parse({
    title: formData.get('title'),
    accountId: (formData.get('accountId') as string | null) || null,
    status: formData.get('status'),
    meetingDate: formData.get('meetingDate'),
    startTime: (formData.get('startTime') as string | null) || null,
    durationHours: (formData.get('durationHours') as string | null) || null,
    mode: formData.get('mode'),
    location: (formData.get('location') as string | null) || null,
    agenda: (formData.get('agenda') as string | null) || null,
    outcomeNotes: (formData.get('outcomeNotes') as string | null) || null,
    projectIds: formData.getAll('projectIds').filter((v) => v !== ''),
    attendeePersonIds: formData.getAll('attendeePersonIds').filter((v) => v !== ''),
    expenseAmount: (formData.get('expenseAmount') as string | null) || null,
    expenseCategory: (formData.get('expenseCategory') as string | null) || null,
  })

  const meetingId = await createMeeting(session, {
    ...parsed,
    accountId: parsed.accountId,
    attendeeUserIds: [session.userId], // the logger attended
  })

  // Optional expense against the visit — skippable, never mandatory (Flow G).
  if (parsed.expenseAmount && parsed.expenseCategory) {
    await createExpense(session, {
      expenseDate: parsed.meetingDate,
      category: parsed.expenseCategory,
      amount: parsed.expenseAmount,
      meetingId,
      projectId: parsed.projectIds.length === 1 ? parsed.projectIds[0] : null,
    })
  }

  revalidatePath('/meetings')
  if (parsed.accountId) revalidatePath(`/accounts/${parsed.accountId}`)
}
