// Data access for meetings. A meeting belongs to an account and may cover
// several projects, or none (phase1-architecture-decisions A4). Hours are
// reported at ACCOUNT level, never per project — one 3-hour visit covering
// two projects is not 6 hours of effort.
import 'server-only'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { accounts, meetingProjects, meetings, projects, users } from '@/db/schema'
import type { AppSession } from '@/lib/session'

export interface MeetingDto {
  id: number
  accountId: number
  accountName: string
  date: string
  durationMinutes: number | null
  notes: string | null
  createdByName: string
  projects: { id: number; name: string }[]
}

async function attachProjects(rows: Omit<MeetingDto, 'projects'>[]): Promise<MeetingDto[]> {
  if (rows.length === 0) return []
  const links = await db
    .select({
      meetingId: meetingProjects.meetingId,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(meetingProjects)
    .innerJoin(projects, eq(meetingProjects.projectId, projects.id))
    .where(inArray(meetingProjects.meetingId, rows.map((r) => r.id)))
  const byMeeting = new Map<number, { id: number; name: string }[]>()
  for (const l of links) {
    const list = byMeeting.get(l.meetingId) ?? []
    list.push({ id: l.projectId, name: l.projectName })
    byMeeting.set(l.meetingId, list)
  }
  return rows.map((r) => ({ ...r, projects: byMeeting.get(r.id) ?? [] }))
}

const baseSelect = {
  id: meetings.id,
  accountId: meetings.accountId,
  accountName: accounts.name,
  date: meetings.date,
  durationMinutes: meetings.durationMinutes,
  notes: meetings.notes,
  createdByName: users.name,
}

export async function listMeetings(limit = 100): Promise<MeetingDto[]> {
  const rows = await db
    .select(baseSelect)
    .from(meetings)
    .innerJoin(accounts, eq(meetings.accountId, accounts.id))
    .innerJoin(users, eq(meetings.createdById, users.id))
    .orderBy(desc(meetings.date), desc(meetings.id))
    .limit(limit)
  return attachProjects(rows)
}

export async function listMeetingsForAccount(accountId: number): Promise<MeetingDto[]> {
  const rows = await db
    .select(baseSelect)
    .from(meetings)
    .innerJoin(accounts, eq(meetings.accountId, accounts.id))
    .innerJoin(users, eq(meetings.createdById, users.id))
    .where(eq(meetings.accountId, accountId))
    .orderBy(desc(meetings.date), desc(meetings.id))
  return attachProjects(rows)
}

/** Total logged meeting minutes for an account — the A4(c) reporting rule. */
export async function accountMeetingMinutes(accountId: number): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${meetings.durationMinutes}), 0)::int` })
    .from(meetings)
    .where(eq(meetings.accountId, accountId))
  return rows[0]?.total ?? 0
}

export async function createMeeting(
  session: AppSession,
  input: {
    accountId: number
    date: string
    durationMinutes?: number | null
    notes?: string | null
    projectIds?: number[]
  },
): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(meetings)
      .values({
        accountId: input.accountId,
        date: input.date,
        durationMinutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
        createdById: session.userId,
      })
      .returning({ id: meetings.id })
    const meetingId = rows[0].id
    const projectIds = [...new Set(input.projectIds ?? [])]
    if (projectIds.length > 0) {
      // Linked projects must belong to the meeting's account — reject a
      // well-formed id pointing at another account's project (G1).
      const valid = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(inArray(projects.id, projectIds), eq(projects.accountId, input.accountId)))
      if (valid.length !== projectIds.length) {
        throw new Error('A linked project does not belong to this account')
      }
      await tx
        .insert(meetingProjects)
        .values(projectIds.map((projectId) => ({ meetingId, projectId })))
    }
    return meetingId
  })
}
