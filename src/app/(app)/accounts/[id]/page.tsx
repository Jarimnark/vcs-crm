import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getAccount, listPeople } from '@/lib/data/accounts'
import { accountMeetingMinutes, listMeetingsForAccount } from '@/lib/data/meetings'
import { createPersonAction, createProjectAction } from '../actions'

export const dynamic = 'force-dynamic'

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const accountId = Number(id)
  if (!Number.isInteger(accountId)) notFound()

  const account = await getAccount(accountId)
  if (!account) notFound()
  const contacts = await listPeople(accountId)
  const meetings = await listMeetingsForAccount(accountId)
  const meetingMinutes = await accountMeetingMinutes(accountId)

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
                No contacts yet — add one below.
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

      <h2>New contact</h2>
      <div className="card">
        <form className="stack" action={createPersonAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <label>
            Name
            <input name="name" required maxLength={200} />
          </label>
          <label>
            Position
            <input name="position" maxLength={200} />
          </label>
          <label>
            Email
            <input name="email" type="email" maxLength={320} />
          </label>
          <label>
            Tel
            <input name="tel" maxLength={50} />
          </label>
          <label>
            Mobile
            <input name="mobile" maxLength={50} />
          </label>
          <button>Add contact</button>
        </form>
      </div>

      <h2>
        Meetings{' '}
        <span className="muted" style={{ fontWeight: 'normal', fontSize: '0.9rem' }}>
          — {formatHours(meetingMinutes)} logged with this account
        </span>
      </h2>
      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Duration</th>
            <th>Projects</th>
            <th>Notes</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {meetings.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No meetings logged — use the <Link href="/meetings">Meetings</Link> page.
              </td>
            </tr>
          )}
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{m.date}</td>
              <td>{m.durationMinutes != null ? formatHours(m.durationMinutes) : '—'}</td>
              <td>
                {m.projects.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <Link href={`/projects/${p.id}`}>{p.name}</Link>
                  </span>
                ))}
              </td>
              <td>{m.notes}</td>
              <td>{m.createdByName}</td>
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
