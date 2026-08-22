'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { setFollowup, setProgress, setStatus } from '@/lib/data/projects'
import { createOrder, voidOrder } from '@/lib/data/orders'

export async function setProgressAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const projectId = z.coerce.number().int().positive().parse(formData.get('projectId'))
  const progress = z.coerce.number().int().parse(formData.get('progress'))
  await setProgress(session, projectId, progress)
  revalidatePath(`/projects/${projectId}`)
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const projectId = z.coerce.number().int().positive().parse(formData.get('projectId'))
  const status = z.enum(['open', 'won', 'lost']).parse(formData.get('status'))
  await setStatus(session, projectId, status, {
    lostReason: (formData.get('lostReason') as string | null) || null,
    lostNote: (formData.get('lostNote') as string | null) || null,
    competitor: (formData.get('competitor') as string | null) || null,
  })
  revalidatePath(`/projects/${projectId}`)
}

// The reorder loop controls (ADR-0029, K3): interval + pause.
export async function setFollowupAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const projectId = z.coerce.number().int().positive().parse(formData.get('projectId'))
  const raw = (formData.get('intervalDays') as string | null) || null
  const intervalDays = raw ? z.coerce.number().int().min(1).max(999).parse(raw) : null
  const paused = formData.get('paused') === 'on'
  await setFollowup(session, projectId, { intervalDays, paused })
  revalidatePath(`/projects/${projectId}`)
}

const NewOrderSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  poNumber: z.string().trim().min(1).max(100),
  poDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
})

// Logging an order is three fields plus a date (Flow E) — it also resets
// the follow-up clock, which is what the engineer actually wants.
export async function createOrderAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const parsed = NewOrderSchema.parse({
    projectId: formData.get('projectId'),
    poNumber: formData.get('poNumber'),
    poDate: formData.get('poDate'),
    amount: formData.get('amount'),
  })
  await createOrder(session, parsed)
  revalidatePath(`/projects/${parsed.projectId}`)
}

export async function voidOrderAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const projectId = z.coerce.number().int().positive().parse(formData.get('projectId'))
  const orderId = z.coerce.number().int().positive().parse(formData.get('orderId'))
  await voidOrder(session, orderId)
  revalidatePath(`/projects/${projectId}`)
}
