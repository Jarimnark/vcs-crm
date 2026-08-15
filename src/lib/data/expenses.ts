// The Data Access Layer for expenses — the ONLY module permitted to import
// the `expenses` table (G1, ADR-0017, ADR-0039). It exports no unscoped
// query: every function takes the caller's session and enforces the
// visibility rule in the WHERE clause, not in the UI.
//
// Rule (ADR-0017): a user sees their own expenses; a manager sees all.
// When a row is out of scope the answer is "not found", never "forbidden" —
// don't confirm it exists.
import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses } from '@/db/schema'
import { isManager, type AppSession } from '@/lib/session'

export interface ExpenseDto {
  id: number
  projectId: number | null
  incurredByUserId: string
  date: string
  amount: string
  currency: string
  category: string | null
  note: string | null
  hasReceipt: boolean
}

// DTO shape only (G2) — receiptPath stays server-side; the receipt is
// fetched through the authenticated media route, which re-checks scope.
function toDto(row: typeof expenses.$inferSelect): ExpenseDto {
  return {
    id: row.id,
    projectId: row.projectId,
    incurredByUserId: row.incurredByUserId,
    date: row.date,
    amount: row.amount,
    currency: row.currency,
    category: row.category,
    note: row.note,
    hasReceipt: row.receiptPath != null,
  }
}

function scopeFor(session: AppSession) {
  return isManager(session) ? undefined : eq(expenses.incurredByUserId, session.userId)
}

export async function listExpenses(session: AppSession): Promise<ExpenseDto[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(scopeFor(session))
    .orderBy(desc(expenses.date), desc(expenses.id))
  return rows.map(toDto)
}

export async function getExpense(session: AppSession, id: number): Promise<ExpenseDto | null> {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), scopeFor(session)))
    .limit(1)
  return rows[0] ? toDto(rows[0]) : null
}

/** Receipt path, scope-checked — used only by the media route. */
export async function getExpenseReceiptPath(
  session: AppSession,
  id: number,
): Promise<string | null> {
  const rows = await db
    .select({ receiptPath: expenses.receiptPath })
    .from(expenses)
    .where(and(eq(expenses.id, id), scopeFor(session)))
    .limit(1)
  return rows[0]?.receiptPath ?? null
}

export interface NewExpense {
  projectId?: number | null
  date: string
  amount: string
  currency?: string
  category?: string | null
  note?: string | null
  receiptPath?: string | null
}

/** An expense is always created as the caller's own. */
export async function createExpense(session: AppSession, input: NewExpense): Promise<ExpenseDto> {
  const rows = await db
    .insert(expenses)
    .values({
      projectId: input.projectId ?? null,
      incurredByUserId: session.userId, // never client-supplied
      date: input.date,
      amount: input.amount,
      currency: input.currency ?? 'THB',
      category: input.category ?? null,
      note: input.note ?? null,
      receiptPath: input.receiptPath ?? null,
    })
    .returning()
  return toDto(rows[0])
}

/** Update is scoped to the owner in the query itself — the boundary. */
export async function updateExpenseNote(
  session: AppSession,
  expenseId: number,
  note: string,
): Promise<ExpenseDto | null> {
  const rows = await db
    .update(expenses)
    .set({ note })
    .where(and(eq(expenses.id, expenseId), eq(expenses.incurredByUserId, session.userId)))
    .returning()
  return rows[0] ? toDto(rows[0]) : null
}
