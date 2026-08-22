'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { createMeeting } from '@/lib/data/meetings'

const NewMeetingSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().int().min(0).max(24 * 60).nullable(),
  notes: z.string().trim().max(5000).nullable(),
  projectIds: z.array(z.coerce.number().int().positive()),
})

export async function createMeetingAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewMeetingSchema.parse({
    accountId: formData.get('accountId'),
    date: formData.get('date'),
    durationMinutes: (formData.get('durationMinutes') as string | null) || null,
    notes: (formData.get('notes') as string | null) || null,
    projectIds: formData.getAll('projectIds').filter((v) => v !== ''),
  })
  await createMeeting(session, parsed)
  revalidatePath('/meetings')
  revalidatePath(`/accounts/${parsed.accountId}`)
}
