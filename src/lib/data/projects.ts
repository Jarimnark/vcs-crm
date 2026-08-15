// Data access for projects. Progress and status are independent (ADR-0028);
// every change to either is recorded in project_history, including backwards
// (testing priority 8). Progress freezes on loss.
import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { accounts, projectHistory, projects } from '@/db/schema'
import type { AppSession } from '@/lib/session'

// Fixed steps (ADR-0025). Labels for 40/60/80 are inferred, not client-
// confirmed (open question B8) — display only, no schema impact.
export const PROGRESS_STEPS: Record<number, string> = {
  10: 'Lead',
  20: 'Qualified',
  30: 'Needs analysis',
  40: 'Solution proposed',
  60: 'Quotation sent',
  80: 'Negotiation',
  90: 'PO received',
  100: 'Repeat ordering established',
}

export interface ProjectDto {
  id: number
  accountId: number
  accountName: string
  name: string
  type: 'consumable' | 'equipment' | 'part' | 'service'
  progress: number
  status: 'open' | 'won' | 'lost'
  lostReason: string | null
  expectedAmount: string | null
  currency: string
  ownerId: string
}

export async function listProjects(): Promise<ProjectDto[]> {
  const rows = await db
    .select({
      id: projects.id,
      accountId: projects.accountId,
      accountName: accounts.name,
      name: projects.name,
      type: projects.type,
      progress: projects.progress,
      status: projects.status,
      lostReason: projects.lostReason,
      expectedAmount: projects.expectedAmount,
      currency: projects.currency,
      ownerId: projects.ownerId,
    })
    .from(projects)
    .innerJoin(accounts, eq(projects.accountId, accounts.id))
    .orderBy(desc(projects.updatedAt))
  return rows
}

export async function getProject(id: number): Promise<ProjectDto | null> {
  const rows = await db
    .select({
      id: projects.id,
      accountId: projects.accountId,
      accountName: accounts.name,
      name: projects.name,
      type: projects.type,
      progress: projects.progress,
      status: projects.status,
      lostReason: projects.lostReason,
      expectedAmount: projects.expectedAmount,
      currency: projects.currency,
      ownerId: projects.ownerId,
    })
    .from(projects)
    .innerJoin(accounts, eq(projects.accountId, accounts.id))
    .where(eq(projects.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createProject(
  session: AppSession,
  input: {
    accountId: number
    name: string
    type: ProjectDto['type']
    expectedAmount?: string | null
    currency?: string
  },
): Promise<number> {
  const rows = await db
    .insert(projects)
    .values({
      accountId: input.accountId,
      name: input.name,
      type: input.type,
      expectedAmount: input.expectedAmount ?? null,
      currency: input.currency ?? 'THB',
      ownerId: session.userId,
    })
    .returning({ id: projects.id })
  return rows[0].id
}

/** Set progress, writing history. Rejected when the project is lost. */
export async function setProgress(
  session: AppSession,
  projectId: number,
  progress: number,
): Promise<void> {
  if (!(progress in PROGRESS_STEPS)) throw new Error(`Invalid progress step: ${progress}`)
  await db.transaction(async (tx) => {
    const current = await tx
      .select({ progress: projects.progress, status: projects.status })
      .from(projects)
      .where(eq(projects.id, projectId))
      .for('update')
      .limit(1)
    if (!current[0]) throw new Error('Project not found')
    // Progress freezes on loss so lost-at-what-stage stays answerable (ADR-0028).
    if (current[0].status === 'lost') throw new Error('Progress is frozen on a lost project')
    if (current[0].progress === progress) return
    await tx.update(projects).set({ progress, updatedAt: new Date() }).where(eq(projects.id, projectId))
    await tx.insert(projectHistory).values({
      projectId,
      field: 'progress',
      oldValue: String(current[0].progress),
      newValue: String(progress),
      changedById: session.userId,
    })
  })
}

/** Set status, writing history. Status is set by hand (open question B7). */
export async function setStatus(
  session: AppSession,
  projectId: number,
  status: ProjectDto['status'],
  lostReason?: string | null,
): Promise<void> {
  if (status === 'lost' && !lostReason) throw new Error('A lost project needs a lost reason')
  await db.transaction(async (tx) => {
    const current = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.id, projectId))
      .for('update')
      .limit(1)
    if (!current[0]) throw new Error('Project not found')
    if (current[0].status === status) return
    await tx
      .update(projects)
      .set({ status, lostReason: status === 'lost' ? (lostReason ?? null) : null, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
    await tx.insert(projectHistory).values({
      projectId,
      field: 'status',
      oldValue: current[0].status,
      newValue: status,
      changedById: session.userId,
    })
  })
}
