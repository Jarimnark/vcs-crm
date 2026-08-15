'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { setProgress, setStatus } from '@/lib/data/projects'

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
  const lostReason = (formData.get('lostReason') as string | null) || null
  await setStatus(session, projectId, status, lostReason)
  revalidatePath(`/projects/${projectId}`)
}
