import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getAccount, listPeople } from '@/lib/data/accounts'
import { createProjectAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const accountId = Number(id)
  if (!Number.isInteger(accountId)) notFound()

  const account = await getAccount(accountId)
  if (!account) notFound()
  const contacts = await listPeople(accountId)

  return (
    <>
      <h1>{account.name}</h1>
      <div className="card">
        <p>
          {account.type} ·{' '}
          {account.taxId ? `${account.taxId}${account.taxBranch ? ` (${account.taxBranch})` : ''}` : 'No tax ID'}
        </p>
        {account.address && <p className="muted">{account.address}</p>}
      </div>

      <h2>Contacts</h2>
      <table className="list">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No contacts yet.
              </td>
            </tr>
          )}
          {contacts.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.position}</td>
              <td>{p.email}</td>
              <td>{p.mobile ?? p.tel}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>New project for this account</h2>
      <div className="card">
        <form className="stack" action={createProjectAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <label>
            Project name
            <input name="name" required maxLength={300} />
          </label>
          <label>
            Type
            <select name="type" defaultValue="consumable">
              <option value="consumable">Consumable</option>
              <option value="equipment">Equipment</option>
              <option value="part">Part</option>
              <option value="service">Service</option>
            </select>
          </label>
          <label>
            Expected amount (THB)
            <input name="expectedAmount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <button>Create project</button>
        </form>
      </div>
    </>
  )
}
