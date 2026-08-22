// Data access for meetings (02 §8.2–8.4). A meeting belongs to an account
// (or none), may cover several projects or none, and lists internal AND
// external attendees. Hours are reported per ACCOUNT and per user, never
// per project.
import 'server-only'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  accounts,
  meetingAttendees,
  meetingProjects,
  meetings,
  people,
  projects,
  users,
  type MeetingMode,
  type MeetingStatus,
} from '@/db/schema'
import type { AppSession } from '@/lib/session'

export interface MeetingDto {
  id: number
  title: string
  accountId: number | null
  accountName: string | null
  status: MeetingStatus
  meetingDate: string
  startTime: string | null
  durationHours: string | null
  mode: MeetingMode
  location: string | null
  agenda: string | null
  outcomeNotes: string | null
  createdByName: string | null
  projects: { id: number; name: string }[]
  attendees: { kind: 'user' | 'person'; name: string }[]
}

const baseSelect = {
  id: meetings.id,
  title: meetings.title,
  accountId: meetings.accountId,
  accountName: accounts.name,
  status: meetings.status,
  meetingDate: meetings.meetingDate,
  startTime: meetings.startTime,
  durationHours: meetings.durationHours,
  mode: meetings.mode,
  location: meetings.location,
  agenda: meetings.agenda,
  outcomeNotes: meetings.outcomeNotes,
  createdByName: users.name,
}

type BaseRow = Omit<MeetingDto, 'projects' | 'attendees'>

async function attachRelations(rows: BaseRow[]): Promise<MeetingDto[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const links = await db
    .select({
      meetingId: meetingProjects.meetingId,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(meetingProjects)
    .innerJoin(projects, eq(meetingProjects.projectId, projects.id))
    .where(inArray(meetingProjects.meetingId, ids))

  const attendeeRows = await db
    .select({
      meetingId: meetingAttendees.meetingId,
      personName: people.name,
      userName: users.name,
    })
    .from(meetingAttendees)
    .leftJoin(people, eq(meetingAttendees.personId, people.id))
    .leftJoin(users, eq(meetingAttendees.userId, users.id))
    .where(inArray(meetingAttendees.meetingId, ids))

  const projectsBy = new Map<number, { id: number; name: string }[]>()
  for (const l of links) {
    const list = projectsBy.get(l.meetingId) ?? []
    list.push({ id: l.projectId, name: l.projectName })
    projectsBy.set(l.meetingId, list)
  }
  const attendeesBy = new Map<number, { kind: 'user' | 'person'; name: string }[]>()
  for (const a of attendeeRows) {
    const list = attendeesBy.get(a.meetingId) ?? []
    if (a.userName) list.push({ kind: 'user', name: a.userName })
    else if (a.personName) list.push({ kind: 'person', name: a.personName })
    attendeesBy.set(a.meetingId, list)
  }

  return rows.map((r) => ({
    ...r,
    projects: projectsBy.get(r.id) ?? [],
    attendees: attendeesBy.get(r.id) ?? [],
  }))
}

export async function listMeetings(limit = 100): Promise<MeetingDto[]> {
  const rows = await db
    .select(baseSelect)
    .from(meetings)
    .leftJoin(accounts, eq(meetings.accountId, accounts.id))
    .leftJoin(users, eq(meetings.createdById, users.id))
    .orderBy(desc(meetings.meetingDate), desc(meetings.id))
    .limit(limit)
  return attachRelations(rows)
}

export async function listMeetingsForAccount(accountId: number): Promise<MeetingDto[]> {
  const rows = await db
    .select(baseSelect)
    .from(meetings)
    .leftJoin(accounts, eq(meetings.accountId, accounts.id))
    .leftJoin(users, eq(meetings.createdById, users.id))
    .where(eq(meetings.accountId, accountId))
    .orderBy(desc(meetings.meetingDate), desc(meetings.id))
  return attachRelations(rows)
}

/** Total logged hours for an account — N3: account level, never per project. */
export async function accountMeetingHours(accountId: number): Promise<string> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${meetings.durationHours}), 0)::numeric(8,2)` })
    .from(meetings)
    .where(and(eq(meetings.accountId, accountId), eq(meetings.status, 'completed')))
  return rows[0]?.total ?? '0.00'
}

export async function createMeeting(
  session: AppSession,
  input: {
    title: string
    accountId?: number | null
    status?: MeetingStatus
    meetingDate: string
    startTime?: string | null
    durationHours?: string | null
    mode?: MeetingMode
    location?: string | null
    agenda?: string | null
    outcomeNotes?: string | null
    projectIds?: number[]
    attendeePersonIds?: number[]
    attendeeUserIds?: string[]
  },
): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(meetings)
      .values({
        title: input.title,
        accountId: input.accountId ?? null,
        status: input.status ?? 'completed',
        meetingDate: input.meetingDate,
        startTime: input.startTime ?? null,
        durationHours: input.durationHours ?? null,
        mode: input.mode ?? 'client_site',
        location: input.location ?? null,
        agenda: input.agenda ?? null,
        outcomeNotes: input.outcomeNotes ?? null,
        createdById: session.userId,
        updatedById: session.userId,
      })
      .returning({ id: meetings.id })
    const meetingId = rows[0].id

    const projectIds = [...new Set(input.projectIds ?? [])]
    if (projectIds.length > 0) {
      if (input.accountId == null) {
        throw new Error('Projects can only be linked when the meeting has an account')
      }
      // A linked project must belong to the meeting's account — a well-formed
      // id pointing elsewhere is rejected (G1).
      const valid = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(inArray(projects.id, projectIds), eq(projects.accountId, input.accountId)))
      if (valid.length !== projectIds.length) {
        throw new Error('A linked project does not belong to this account')
      }
      await tx.insert(meetingProjects).values(projectIds.map((projectId) => ({ meetingId, projectId })))
    }

    const personIds = [...new Set(input.attendeePersonIds ?? [])]
    if (personIds.length > 0) {
      await tx.insert(meetingAttendees).values(personIds.map((personId) => ({ meetingId, personId })))
    }
    const userIds = [...new Set(input.attendeeUserIds ?? [])]
    if (userIds.length > 0) {
      await tx.insert(meetingAttendees).values(userIds.map((userId) => ({ meetingId, userId })))
    }
    return meetingId
  })
}
