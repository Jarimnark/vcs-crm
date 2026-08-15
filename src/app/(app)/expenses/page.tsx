// Expenses — minimal capture (ADR-0039), restricted visibility (ADR-0017):
// a user sees their own; a manager sees all. The rule is enforced in
// lib/data/expenses.ts (the DAL), not in this page.
import { requireSessionOrRedirect, isManager } from '@/lib/session'
import { listExpenses } from '@/lib/data/expenses'
import { formatMoney } from '@/lib/money'
import { createExpenseAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const session = await requireSessionOrRedirect()
  const expenses = await listExpenses(session)

  return (
    <>
      <h1>Expenses {isManager(session) && <span className="badge">manager view — all users</span>}</h1>
      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Note</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No expenses recorded.
              </td>
            </tr>
          )}
          {expenses.map((e) => (
            <tr key={e.id}>
              <td>{e.date}</td>
              <td>{e.category}</td>
              <td>{e.note}</td>
              <td className="num">
                {formatMoney(e.amount)} {e.currency}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Record expense</h2>
      <div className="card">
        <form className="stack" action={createExpenseAction}>
          <label>
            Date
            <input name="date" type="date" required />
          </label>
          <label>
            Amount (THB)
            <input name="amount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <label>
            Category
            <input name="category" maxLength={100} />
          </label>
          <label>
            Note
            <input name="note" maxLength={1000} />
          </label>
          <button>Save</button>
        </form>
      </div>
    </>
  )
}
