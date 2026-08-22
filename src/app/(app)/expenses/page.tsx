// Expenses — minimal capture (ADR-0039), restricted visibility (ADR-0017):
// a user sees their own; sales_manager/ceo see all. Enforced in
// lib/data/expenses.ts (the DAL), not in this page.
import { requireSessionOrRedirect, canSeeAllExpenses } from '@/lib/session'
import { listExpenses } from '@/lib/data/expenses'
import { formatMoney } from '@/lib/money'
import { createExpenseAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const session = await requireSessionOrRedirect()
  const expenses = await listExpenses(session)

  return (
    <>
      <h1>
        Expenses{' '}
        {canSeeAllExpenses(session) && <span className="badge">manager view — all users</span>}
      </h1>
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
              <td>{e.expenseDate}</td>
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
        <p className="muted">🔒 Only you and your manager can see this.</p>
        <form className="stack" action={createExpenseAction}>
          <label>
            Date
            <input name="expenseDate" type="date" required />
          </label>
          <label>
            Category
            <select name="category" defaultValue="travel">
              <option value="travel">Travel</option>
              <option value="fuel">Fuel</option>
              <option value="accommodation">Accommodation</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
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
