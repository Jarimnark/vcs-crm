'use server'

// G1: authenticate → authorize → validate, in that order.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { completeTask, createTask, updateTask } from '@/lib/data/tasks'

const TaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable(),
  typeId: z.coerce.number().int().positive().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  assigneeUserId: z.string().min(1),
  projectId: z.coerce.number().int().positive().nullable(),
  accountId: z.coerce.number().int().positive().nullable(),
  personId: z.coerce.number().int().positive().nullable(),
})

function parseTaskForm(formData: FormData) {
  return TaskSchema.parse({
    title: formData.get('title'),
    description: (formData.get('description') as string | null) || null,
    typeId: (formData.get('typeId') as string | null) || null,
    dueDate: (formData.get('dueDate') as string | null) || null,
    assigneeUserId: formData.get('assigneeUserId'),
    projectId: (formData.get('projectId') as string | null) || null,
    accountId: (formData.get('accountId') as string | null) || null,
    personId: (formData.get('personId') as string | null) || null,
  })
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = parseTaskForm(formData)
  const id = await createTask(session, parsed)
  revalidatePath('/tasks')
  redirect(`/tasks/${id}`)
}

export async function updateTaskAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const taskId = z.coerce.number().int().positive().parse(formData.get('taskId'))
  const status = z.enum(['open', 'in_progress', 'done', 'cancelled']).parse(formData.get('status'))
  const parsed = parseTaskForm(formData)
  const ok = await updateTask(session, taskId, { ...parsed, status })
  if (!ok) throw new Error('Task not found')
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${taskId}`)
  redirect(`/tasks/${taskId}`)
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const taskId = z.coerce.number().int().positive().parse(formData.get('taskId'))
  // Assignee-scoped; completing an auto follow-up schedules the next one
  // inside the same transaction (ADR-0029).
  await completeTask(session, taskId)
  revalidatePath('/tasks')
}
