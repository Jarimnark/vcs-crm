import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listAccounts } from '@/lib/data/accounts'
import { createAccountAction } from './actions'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  supplier: 'Supplier',
  manufacturer: 'Manufacturer',
  service_provider: 'Service provider',
  logistics: 'Logistics',
}

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
            <th>Types</th>
            <th>Status</th>
            <th>Tax ID</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No accounts yet.
              </td>
            </tr>
          )}
          {accounts.map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/accounts/${a.id}`}>{a.name}</Link>
              </td>
              <td>
                {a.types.map((t) => (
                  <span key={t} className="badge" style={{ marginRight: '0.25rem' }}>
                    {TYPE_LABELS[t] ?? t}
                  </span>
                ))}
              </td>
              <td>{a.status}</td>
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
            <input name="name" required maxLength={255} />
          </label>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Types — an account plays as many roles as it plays
            </span>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <label
                key={value}
                style={{ flexDirection: 'row' as const, alignItems: 'center', gap: '0.5rem' }}
              >
                <input type="checkbox" name="types" value={value} defaultChecked={value === 'client'} />
                {label}
              </label>
            ))}
          </fieldset>
          <label>
            Industry
            <input name="industry" maxLength={100} />
          </label>
          <label>
            Address
            <textarea name="address" rows={3} />
          </label>
          <label>
            Tax ID
            <input name="taxId" maxLength={20} />
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
