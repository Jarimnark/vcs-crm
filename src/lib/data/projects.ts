// Data access for projects (02 §5). Progress and status are independent
// (ADR-0028) and both are set BY HAND (ADR-0046 B7/B10). Every change writes
// project_history, including backwards moves. Progress freezes on loss.
// Progress displays as plain percentages — no labels (ADR-0046 B8).
import 'server-only'
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  accounts,
  projectHistory,
  projects,
  PROGRESS_STEPS,
  type ProjectStatus,
  type ProjectType,
} from '@/db/schema'
import { likePattern, offsetFor, PAGE_SIZE, paged, type Paged } from '@/lib/list'
import type { AppSession } from '@/lib/session'

export { PROGRESS_STEPS }

// The ladder definitions (user-story §2.2) — shown beside the stepper
// (review round 1, supersedes the earlier "no labels" answer). 90/100 differ
// by type (§2.3). 40/60/80 wording is inferred, not client-confirmed (B8).
export function progressDefinition(step: number, type: ProjectType): string {
  switch (step) {
    case 10:
      return 'Lead received'
    case 20:
      return 'Inquiry captured'
    case 30:
      return 'Spec review — supplier request sent'
    case 40:
      return 'Proposal / spec confirmed'
    case 50:
      return 'Quoted — quotation issued to client'
    case 60:
      return 'Client reviewing'
    case 70:
      return 'Negotiation'
    case 80:
      return 'Final terms agreed — PO pending'
    case 90:
      return type === 'consumable' ? 'Won — first order confirmed' : 'PO imminent'
    case 100:
      return type === 'consumable' ? 'Repeat ordering established' : 'PO received'
    default:
      return ''
  }
}

export interface ProjectDto {
  id: number
  accountId: number
  accountName: string
  name: string
  type: ProjectType
  progress: number
  status: ProjectStatus
  lostReason: string | null
  competitor: string | null
  expectedAmount: string | null
  quotedValue: string | null
  currency: string
  expectedCloseDate: string | null
  ownerUserId: string
  followupIntervalDays: number | null
  followupPaused: boolean
  parentProjectId: number | null
}

const projectSelection = {
  id: projects.id,
  accountId: projects.accountId,
  accountName: accounts.name,
  name: projects.name,
  type: projects.type,
  progress: projects.progress,
  status: projects.status,
  lostReason: projects.lostReason,
  competitor: projects.competitor,
  expectedAmount: projects.expectedAmount,
  quotedValue: projects.quotedValue,
  currency: projects.currency,
  expectedCloseDate: projects.expectedCloseDate,
  ownerUserId: projects.ownerUserId,
  followupIntervalDays: projects.followupIntervalDays,
  followupPaused: projects.followupPaused,
  parentProjectId: projects.parentProjectId,
}

export interface ProjectFilters {
  q?: string
  status?: ProjectStatus
  type?: ProjectType
  page?: number
}

export async function listProjects(f: ProjectFilters = {}): Promise<Paged<ProjectDto>> {
  const page = f.page ?? 1
  const conditions: SQL[] = []
  if (f.q) {
    const p = likePattern(f.q)
    conditions.push(or(ilike(projects.name, p), ilike(accounts.name, p))!)
  }
  if (f.status) conditions.push(eq(projects.status, f.status))
  if (f.type) conditions.push(eq(projects.type, f.type))
  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select(projectSelection)
    .from(projects)
    .innerJoin(accounts, eq(projects.accountId, accounts.id))
    .where(where)
    .orderBy(desc(projects.updatedAt))
    .limit(PAGE_SIZE)
    .offset(offsetFor(page))
  const total = await db
    .select({ n: count() })
    .from(projects)
    .innerJoin(accounts, eq(projects.accountId, accounts.id))
    .where(where)
  return paged(rows, total[0].n, page)
}

/** Unpaged list for reports. */
export async function listAllProjects(): Promise<ProjectDto[]> {
  return db
    .select(projectSelection)
    .from(projects)
    .innerJoin(accounts, eq(projects.accountId, accounts.id))
    .orderBy(desc(projects.updatedAt))
}

export async function getProject(id: number): Promise<ProjectDto | null> {
  const rows = await db
    .select(projectSelection)
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
    type: ProjectType
    primaryPersonId?: number | null
    expectedAmount?: string | null
    currency?: string
    expectedCloseDate?: string | null
    parentProjectId?: number | null
  },
): Promise<number> {
  const rows = await db
    .insert(projects)
    .values({
      accountId: input.accountId,
      name: input.name,
      type: input.type,
      primaryPersonId: input.primaryPersonId ?? null,
      expectedAmount: input.expectedAmount ?? null,
      currency: input.currency ?? 'THB',
      expectedCloseDate: input.expectedCloseDate ?? null,
      parentProjectId: input.type === 'part' ? (input.parentProjectId ?? null) : null,
      ownerUserId: session.userId,
      createdById: session.userId,
      updatedById: session.userId,
    })
    .returning({ id: projects.id })
  return rows[0].id
}

export async function updateProject(
  session: AppSession,
  projectId: number,
  input: {
    name: string
    primaryPersonId?: number | null
    expectedAmount?: string | null
    currency?: string
    expectedCloseDate?: string | null
  },
): Promise<boolean> {
  const rows = await db
    .update(projects)
    .set({
      name: input.name,
      primaryPersonId: input.primaryPersonId ?? null,
      expectedAmount: input.expectedAmount ?? null,
      currency: input.currency ?? 'THB',
      expectedCloseDate: input.expectedCloseDate ?? null,
      updatedById: session.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id })
  return rows.length > 0
}

/** Set progress, writing history. Rejected when the project is lost. */
export async function setProgress(
  session: AppSession,
  projectId: number,
  progress: number,
): Promise<void> {
  if (!(PROGRESS_STEPS as readonly number[]).includes(progress)) {
    throw new Error(`Invalid progress step: ${progress}`)
  }
  await db.transaction(async (tx) => {
    const current = await tx
      .select({ progress: projects.progress, status: projects.status })
      .from(projects)
      .where(eq(projects.id, projectId))
      .for('update')
      .limit(1)
    if (!current[0]) throw new Error('Project not found')
    // Progress freezes on loss — the frozen value IS the lost-at-stage data.
    if (current[0].status === 'lost') throw new Error('Progress is frozen on a lost project')
    if (current[0].progress === progress) return
    await tx
      .update(projects)
      .set({ progress, updatedById: session.userId, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
    await tx.insert(projectHistory).values({
      projectId,
      field: 'progress',
      fromValue: String(current[0].progress),
      toValue: String(progress),
      changedById: session.userId,
    })
  })
}

/**
 * Set status by hand (ADR-0046 B7), writing history. Lost requires a
 * free-text reason (ADR-0046 B9) and may record the competitor.
 */
export async function setStatus(
  session: AppSession,
  projectId: number,
  status: ProjectStatus,
  opts?: { lostReason?: string | null; lostNote?: string | null; competitor?: string | null },
): Promise<void> {
  if (status === 'lost' && !opts?.lostReason?.trim()) {
    throw new Error('A lost project needs a lost reason')
  }
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
      .set({
        status,
        lostReason: status === 'lost' ? (opts?.lostReason?.trim() ?? null) : null,
        lostNote: status === 'lost' ? (opts?.lostNote ?? null) : null,
        competitor: status === 'lost' ? (opts?.competitor ?? null) : null,
        updatedById: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
    await tx.insert(projectHistory).values({
      projectId,
      field: 'status',
      fromValue: current[0].status,
      toValue: status,
      changedById: session.userId,
    })
  })
}

/**
 * The reorder-loop controls (ADR-0029, K3): interval set by the engineer —
 * prompted at Won for consumables — and pause as a first-class state.
 */
export async function setFollowup(
  session: AppSession,
  projectId: number,
  input: { intervalDays: number | null; paused: boolean },
): Promise<void> {
  if (input.intervalDays != null && (input.intervalDays < 1 || input.intervalDays > 999)) {
    throw new Error('Interval must be between 1 and 999 days')
  }
  const rows = await db
    .update(projects)
    .set({
      followupIntervalDays: input.intervalDays,
      followupPaused: input.paused,
      updatedById: session.userId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({ type: projects.type })
  if (!rows.length) throw new Error('Project not found')
}
