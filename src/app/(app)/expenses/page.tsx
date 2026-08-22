// Expenses — minimal capture (ADR-0039), restricted visibility (ADR-0017):
// a user sees their own; sales_manager/ceo see all. Enforced in
// lib/data/expenses.ts (the DAL), not in this page.
import Link from 'next/link'
import { requireSessionOrRedirect, canSeeAllExpenses } from '@/lib/session'
import { listExpenses } from '@/lib/data/expenses'
import { formatMoney } from '@/lib/money'
import { parsePage } from '@/lib/list'
import { Pagination, SearchBar } from '@/components/list-controls'
import { createExpenseAction } from './actions'
import type { ExpenseCategory } from '@/db/schema'

export const dynamic = 'force-dynamic'

const CATEGORIES: ExpenseCategory[] = ['travel', 'fuel', 'accommodation', 'entertainment', 'other']

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}) {
  const session = await requireSessionOrRedirect()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const category = CATEGORIES.includes(sp.category as ExpenseCategory)
    ? (sp.category as ExpenseCategory)
    : undefined
  const result = await listExpenses(session, {
    q: q || undefined,
    category,
    page: parsePage(sp.page),
  })

  return (
    <>
      <h1>
        Expenses{' '}
        {canSeeAllExpenses(session) && <span className="badge">manager view — all users</span>}
      </h1>

      <SearchBar action="/expenses" q={q} placeholder="Search note…">
        <select name="category" defaultValue={category ?? ''}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </SearchBar>

      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Note</th>
            <th className="num">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No expenses recorded.
              </td>
            </tr>
          )}
          {result.rows.map((e) => (
            <tr key={e.id}>
              <td>{e.expenseDate}</td>
              <td>{e.category}</td>
              <td>{e.note}</td>
              <td className="num">
                {formatMoney(e.amount)} {e.currency}
              </td>
              <td>
                {e.incurredByUserId === session.userId && (
                  <Link href={`/expenses/${e.id}/edit`}>Edit</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        paged={result}
        basePath="/expenses"
        params={{ ...(q ? { q } : {}), ...(category ? { category } : {}) }}
      />

      <h2>Record expense</h2>
      <div className="card">
        <p className="muted">🔒 Only you and your manager can see this.</p>
        <form className="stack" action={createExpenseAction}>
          <label>
            Date
            <input name="expenseDate" type="date" required />
          </label>
          <label>
            Category
            <select name="category" defaultValue="travel">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount (THB)
            <input name="amount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <label>
            Note
            <input name="note" maxLength={255} />
          </label>
          <button>Save</button>
        </form>
      </div>
    </>
  )
}
