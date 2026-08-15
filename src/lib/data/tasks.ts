// Data access for tasks. My Tasks is the daily landing page — everything
// assigned to the current user regardless of what it is attached to
// (phase1-architecture-decisions A5).
import 'server-only'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { accounts, projects, tasks } from '@/db/schema'
import type { AppSession } from '@/lib/session'

export interface TaskDto {
  id: number
  title: string
  type: string | null
  projectId: number | null
  projectName: string | null
  accountName: string | null
  dueDate: string | null
  done: boolean
  auto: boolean
}

export async function listMyOpenTasks(session: AppSession): Promise<TaskDto[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      type: tasks.type,
      projectId: tasks.projectId,
      projectName: projects.name,
      accountName: accounts.name,
      dueDate: tasks.dueDate,
      done: tasks.done,
      auto: tasks.auto,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(accounts, eq(tasks.accountId, accounts.id))
    .where(and(eq(tasks.assignedToId, session.userId), eq(tasks.done, false)))
    .orderBy(sql`${tasks.dueDate} asc nulls last`, asc(tasks.id))
  return rows
}

export async function createTask(
  session: AppSession,
  input: {
    title: string
    projectId?: number | null
    accountId?: number | null
    dueDate?: string | null
    assignedToId?: string
  },
): Promise<number> {
  const rows = await db
    .insert(tasks)
    .values({
      title: input.title,
      projectId: input.projectId ?? null,
      accountId: input.accountId ?? null,
      dueDate: input.dueDate ?? null,
      assignedToId: input.assignedToId ?? session.userId,
      createdById: session.userId,
    })
    .returning({ id: tasks.id })
  return rows[0].id
}

export async function completeTask(session: AppSession, taskId: number): Promise<boolean> {
  const rows = await db
    .update(tasks)
    .set({ done: true, doneAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.assignedToId, session.userId)))
    .returning({ id: tasks.id })
  return rows.length > 0
}

/**
 * Reorder follow-up generation (ADR-0029), called by the cron route handler.
 * Idempotent — "one open auto-task at a time" per consumable project (testing
 * priority 7): running twice creates one task, and a paused-then-resumed
 * project never accumulates a backlog of overdue chases.
 */
export async function generateFollowupTasks(intervalDays = 90): Promise<number> {
  const candidates = await db
    .select({ id: projects.id, name: projects.name, ownerId: projects.ownerId })
    .from(projects)
    .where(and(eq(projects.type, 'consumable'), eq(projects.status, 'won')))

  let created = 0
  for (const p of candidates) {
    const open = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.projectId, p.id), eq(tasks.auto, true), eq(tasks.done, false)))
      .limit(1)
    if (open.length > 0) continue // the idempotency rule

    // The follow-up interval counts from the most recent order date; a client
    // who orders early resets the clock (phase1-architecture-decisions A3).
    const due = await db.execute(sql`
      select (max(po_date) + ${intervalDays} * interval '1 day')::date as due
      from "order" where project_id = ${p.id}
      having max(po_date) + ${intervalDays} * interval '1 day' <= now()
    `)
    const dueRow = (due.rows as { due: string }[])[0]
    if (!dueRow) continue

    await db.insert(tasks).values({
      title: `Reorder follow-up: ${p.name}`,
      type: 'followup',
      projectId: p.id,
      assignedToId: p.ownerId,
      dueDate: dueRow.due,
      auto: true,
      createdById: p.ownerId,
    })
    created++
  }
  return created
}
