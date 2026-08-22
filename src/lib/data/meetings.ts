// Data access for meetings (02 §8.2–8.4). A meeting belongs to an account
// (or none), may cover several projects or none, and lists internal AND
// external attendees. Hours are reported per ACCOUNT and per user, never
// per project.
import 'server-only'
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
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
import { likePattern, offsetFor, PAGE_SIZE, paged, type Paged } from '@/lib/list'
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

export interface MeetingFilters {
  q?: string
  status?: MeetingStatus
  accountId?: number
  page?: number
}

export async function listMeetings(f: MeetingFilters = {}): Promise<Paged<MeetingDto>> {
  const page = f.page ?? 1
  const conditions: SQL[] = []
  if (f.q) {
    const p = likePattern(f.q)
    conditions.push(or(ilike(meetings.title, p), ilike(accounts.name, p))!)
  }
  if (f.status) conditions.push(eq(meetings.status, f.status))
  if (f.accountId) conditions.push(eq(meetings.accountId, f.accountId))
  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select(baseSelect)
    .from(meetings)
    .leftJoin(accounts, eq(meetings.accountId, accounts.id))
    .leftJoin(users, eq(meetings.createdById, users.id))
    .where(where)
    .orderBy(desc(meetings.meetingDate), desc(meetings.id))
    .limit(PAGE_SIZE)
    .offset(offsetFor(page))
  const total = await db
    .select({ n: count() })
    .from(meetings)
    .leftJoin(accounts, eq(meetings.accountId, accounts.id))
    .where(where)
  const withRelations = await attachRelations(rows)
  return paged(withRelations, total[0].n, page)
}

export interface MeetingDetailDto extends MeetingDto {
  projectIds: number[]
  attendeePersonIds: number[]
}

export async function getMeeting(id: number): Promise<MeetingDetailDto | null> {
  const rows = await db
    .select(baseSelect)
    .from(meetings)
    .leftJoin(accounts, eq(meetings.accountId, accounts.id))
    .leftJoin(users, eq(meetings.createdById, users.id))
    .where(eq(meetings.id, id))
    .limit(1)
  if (!rows[0]) return null
  const [withRelations] = await attachRelations(rows)
  const projectIds = (
    await db
      .select({ id: meetingProjects.projectId })
      .from(meetingProjects)
      .where(eq(meetingProjects.meetingId, id))
  ).map((r) => r.id)
  const attendeePersonIds = (
    await db
      .select({ id: meetingAttendees.personId })
      .from(meetingAttendees)
      .where(and(eq(meetingAttendees.meetingId, id), sql`${meetingAttendees.personId} IS NOT NULL`))
  ).map((r) => r.id!)
  return { ...withRelations, projectIds, attendeePersonIds }
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

export interface MeetingInput {
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
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function writeRelations(tx: Tx, meetingId: number, input: MeetingInput): Promise<void> {
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
}

export async function createMeeting(session: AppSession, input: MeetingInput): Promise<number> {
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
    await writeRelations(tx, meetingId, input)
    return meetingId
  })
}

/** Flat permissions (ADR-0006): any user may edit any meeting. Relations are
 * replaced wholesale, keeping the internal-attendee rows intact. */
export async function updateMeeting(
  session: AppSession,
  meetingId: number,
  input: MeetingInput,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(meetings)
      .set({
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
        updatedById: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId))
      .returning({ id: meetings.id })
    if (!rows.length) return false
    await tx.delete(meetingProjects).where(eq(meetingProjects.meetingId, meetingId))
    await tx
      .delete(meetingAttendees)
      .where(and(eq(meetingAttendees.meetingId, meetingId), sql`${meetingAttendees.personId} IS NOT NULL`))
    await writeRelations(tx, meetingId, { ...input, attendeeUserIds: [] })
    return true
  })
}
