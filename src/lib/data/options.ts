// Small id+label option lists for select inputs. Fields only (G2) — never
// whole rows.
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { accounts, people, picklists, projects, users, type PicklistKind } from '@/db/schema'

export interface AccountOption {
  id: number
  name: string
}
export interface ProjectOption {
  id: number
  name: string
  accountId: number
  status: string
}
export interface PersonOption {
  id: number
  name: string
  accountId: number
}
export interface UserOption {
  id: string
  name: string
}
export interface PicklistOption {
  id: number
  label: string
}

export async function listAccountOptions(): Promise<AccountOption[]> {
  return db.select({ id: accounts.id, name: accounts.name }).from(accounts).orderBy(asc(accounts.name))
}

export async function listProjectOptions(): Promise<ProjectOption[]> {
  return db
    .select({ id: projects.id, name: projects.name, accountId: projects.accountId, status: projects.status })
    .from(projects)
    .orderBy(asc(projects.name))
}

export async function listPersonOptions(): Promise<PersonOption[]> {
  return db
    .select({ id: people.id, name: people.name, accountId: people.accountId })
    .from(people)
    .orderBy(asc(people.name))
}

export async function listUserOptions(): Promise<UserOption[]> {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name))
}

export async function listPicklistOptions(kind: PicklistKind): Promise<PicklistOption[]> {
  return db
    .select({ id: picklists.id, label: picklists.label })
    .from(picklists)
    .where(eq(picklists.kind, kind))
    .orderBy(asc(picklists.sortOrder), asc(picklists.label))
}
