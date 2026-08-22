import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listAccounts } from '@/lib/data/accounts'
import { parsePage } from '@/lib/list'
import { Pagination, SearchBar } from '@/components/list-controls'
import type { AccountStatus, AccountType } from '@/db/schema'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  supplier: 'Supplier',
  manufacturer: 'Manufacturer',
  service_provider: 'Service provider',
  logistics: 'Logistics',
}
const STATUSES: AccountStatus[] = ['active', 'prospect', 'inactive']

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>
}) {
  await requireSessionOrRedirect()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const type = Object.keys(TYPE_LABELS).includes(sp.type ?? '')
    ? (sp.type as AccountType)
    : undefined
  const status = STATUSES.includes(sp.status as AccountStatus)
    ? (sp.status as AccountStatus)
    : undefined
  const result = await listAccounts({ q: q || undefined, type, status, page: parsePage(sp.page) })

  return (
    <>
      <div className="toolbar">
        <h1>Accounts</h1>
        <Link className="button" href="/accounts/new">
          + New account
        </Link>
      </div>

      <SearchBar action="/accounts" q={q} placeholder="Search name or tax ID…">
        <select name="type" defaultValue={type ?? ''}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ''}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </SearchBar>

      <table className="list">
        <thead>
          <tr>
            <th>Name</th>
            <th>Types</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Tax ID</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No accounts found.
              </td>
            </tr>
          )}
          {result.rows.map((a) => (
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
              <td>{a.phone}</td>
              <td>{a.status}</td>
              <td>
                {a.taxId}
                {a.taxBranch ? ` (${a.taxBranch})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        paged={result}
        basePath="/accounts"
        params={{
          ...(q ? { q } : {}),
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
        }}
      />
    </>
  )
}
