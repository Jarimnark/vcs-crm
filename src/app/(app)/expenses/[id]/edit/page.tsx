import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getExpense } from '@/lib/data/expenses'
import { updateExpenseAction } from '../../actions'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['travel', 'fuel', 'accommodation', 'entertainment', 'other'] as const

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionOrRedirect()
  const { id } = await params
  const expenseId = Number(id)
  if (!Number.isInteger(expenseId)) notFound()
  const expense = await getExpense(session, expenseId)
  // Only the owner may edit — a manager can read but not change (DAL rule).
  if (!expense || expense.incurredByUserId !== session.userId) notFound()

  return (
    <>
      <h1>Edit expense</h1>
      <div className="card">
        <form className="stack" action={updateExpenseAction}>
          <input type="hidden" name="expenseId" value={expense.id} />
          <label>
            Date
            <input name="expenseDate" type="date" required defaultValue={expense.expenseDate} />
          </label>
          <label>
            Category
            <select name="category" defaultValue={expense.category}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount ({expense.currency})
            <input
              name="amount"
              required
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              defaultValue={expense.amount}
            />
          </label>
          <label>
            Note
            <input name="note" maxLength={255} defaultValue={expense.note ?? ''} />
          </label>
          <button>Save changes</button>
        </form>
      </div>
    </>
  )
}
