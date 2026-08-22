'use server'

// G1: authenticate → authorize → validate, in that order.
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { completeTask, createTask } from '@/lib/data/tasks'

const NewTaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

export async function createTaskAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewTaskSchema.parse({
    title: formData.get('title'),
    dueDate: (formData.get('dueDate') as string | null) || null,
  })
  await createTask(session, parsed)
  revalidatePath('/tasks')
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const taskId = z.coerce.number().int().positive().parse(formData.get('taskId'))
  // Ownership enforced in the query; completing an auto follow-up schedules
  // the next one inside the same transaction (ADR-0029).
  await completeTask(session, taskId)
  revalidatePath('/tasks')
}
