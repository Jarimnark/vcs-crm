import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listAccounts } from '@/lib/data/accounts'
import { createAccountAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  await requireSessionOrRedirect()
  const accounts = await listAccounts()

  return (
    <>
      <h1>Accounts</h1>
      <table className="list">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Tax ID</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                No accounts yet.
              </td>
            </tr>
          )}
          {accounts.map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/accounts/${a.id}`}>{a.name}</Link>
              </td>
              <td>{a.type}</td>
              <td>
                {a.taxId}
                {a.taxBranch ? ` (${a.taxBranch})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>New account</h2>
      <div className="card">
        <form className="stack" action={createAccountAction}>
          <label>
            Name
            <input name="name" required maxLength={300} />
          </label>
          <label>
            Type
            <select name="type" defaultValue="customer">
              <option value="customer">Customer</option>
              <option value="principal">Principal</option>
              <option value="partner">Partner</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Address
            <textarea name="address" rows={3} />
          </label>
          <label>
            Tax ID
            <input name="taxId" maxLength={50} />
          </label>
          <label>
            Branch designation (e.g. Head Office)
            <input name="taxBranch" maxLength={100} />
          </label>
          <button>Create account</button>
        </form>
      </div>
    </>
  )
}
