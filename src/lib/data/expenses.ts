// The Data Access Layer for expenses — the ONLY module permitted to import
// the `expense` table (02 §9a, G1, ADR-0017, ADR-0039). It exports no
// unscoped query: every function takes the caller's session and enforces
// visibility in the WHERE clause, not in the UI.
//
// Rule: a row is visible to incurred_by and to sales_manager / ceo roles.
// Out of scope → "not found", never "forbidden" — don't confirm it exists.
import 'server-only'
import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, type ExpenseCategory } from '@/db/schema'
import { likePattern, offsetFor, PAGE_SIZE, paged, type Paged } from '@/lib/list'
import { canSeeAllExpenses, type AppSession } from '@/lib/session'

export interface ExpenseDto {
  id: number
  expenseDate: string
  category: ExpenseCategory
  amount: string
  currency: string
  note: string | null
  projectId: number | null
  meetingId: number | null
  incurredByUserId: string
  hasReceipt: boolean
}

// DTO shape only (G2) — receipt path stays server-side; the image is
// fetched through the scoped receipt route, which re-checks visibility.
function toDto(row: typeof expenses.$inferSelect): ExpenseDto {
  return {
    id: row.id,
    expenseDate: row.expenseDate,
    category: row.category,
    amount: row.amount,
    currency: row.currency,
    note: row.note,
    projectId: row.projectId,
    meetingId: row.meetingId,
    incurredByUserId: row.incurredByUserId,
    hasReceipt: row.receiptImage != null,
  }
}

function scopeFor(session: AppSession) {
  return canSeeAllExpenses(session) ? undefined : eq(expenses.incurredByUserId, session.userId)
}

export interface ExpenseFilters {
  q?: string
  category?: ExpenseCategory
  page?: number
}

export async function listExpenses(
  session: AppSession,
  f: ExpenseFilters = {},
): Promise<Paged<ExpenseDto>> {
  const page = f.page ?? 1
  const conditions: SQL[] = []
  const scope = scopeFor(session)
  if (scope) conditions.push(scope)
  if (f.q) conditions.push(ilike(expenses.note, likePattern(f.q)))
  if (f.category) conditions.push(eq(expenses.category, f.category))
  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(PAGE_SIZE)
    .offset(offsetFor(page))
  const total = await db.select({ n: count() }).from(expenses).where(where)
  return paged(rows.map(toDto), total[0].n, page)
}

export async function getExpense(session: AppSession, id: number): Promise<ExpenseDto | null> {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), scopeFor(session)))
    .limit(1)
  return rows[0] ? toDto(rows[0]) : null
}

/** Receipt path, scope-checked — used only by the media-serving route. */
export async function getExpenseReceiptPath(
  session: AppSession,
  id: number,
): Promise<string | null> {
  const rows = await db
    .select({ receiptImage: expenses.receiptImage })
    .from(expenses)
    .where(and(eq(expenses.id, id), scopeFor(session)))
    .limit(1)
  return rows[0]?.receiptImage ?? null
}

export interface NewExpense {
  expenseDate: string
  category: ExpenseCategory
  amount: string
  currency?: string
  note?: string | null
  projectId?: number | null
  meetingId?: number | null
  receiptImage?: string | null
}

/** An expense is always created as the caller's own — never client-supplied. */
export async function createExpense(session: AppSession, input: NewExpense): Promise<ExpenseDto> {
  const rows = await db
    .insert(expenses)
    .values({
      expenseDate: input.expenseDate,
      category: input.category,
      amount: input.amount,
      currency: input.currency ?? 'THB',
      note: input.note ?? null,
      projectId: input.projectId ?? null,
      meetingId: input.meetingId ?? null,
      receiptImage: input.receiptImage ?? null,
      incurredByUserId: session.userId,
    })
    .returning()
  return toDto(rows[0])
}

/** Update is scoped to the OWNER in the query itself — the boundary (G1).
 * Managers may read others' expenses but never edit them. */
export async function updateExpense(
  session: AppSession,
  expenseId: number,
  input: Pick<NewExpense, 'expenseDate' | 'category' | 'amount' | 'note'>,
): Promise<ExpenseDto | null> {
  const rows = await db
    .update(expenses)
    .set({
      expenseDate: input.expenseDate,
      category: input.category,
      amount: input.amount,
      note: input.note ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.id, expenseId), eq(expenses.incurredByUserId, session.userId)))
    .returning()
  return rows[0] ? toDto(rows[0]) : null
}
