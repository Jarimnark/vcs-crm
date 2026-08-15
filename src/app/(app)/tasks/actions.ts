'use server'

// G1: authenticate → authorize → validate, in that order. Take an ID plus
// the change, never a client-supplied object.
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { completeTask, createTask } from '@/lib/data/tasks'

const NewTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
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
  // Ownership is enforced in the query: completeTask scopes by assignee.
  await completeTask(session, taskId)
  revalidatePath('/tasks')
}
