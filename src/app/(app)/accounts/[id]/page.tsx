import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getAccount, listPeople } from '@/lib/data/accounts'
import { accountMeetingHours, listMeetingsForAccount } from '@/lib/data/meetings'
import { createPersonAction, createProjectAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const accountId = Number(id)
  if (!Number.isInteger(accountId)) notFound()

  const account = await getAccount(accountId)
  if (!account) notFound()
  const [contacts, meetings, meetingHours] = await Promise.all([
    listPeople(accountId),
    listMeetingsForAccount(accountId),
    accountMeetingHours(accountId),
  ])

  return (
    <>
      <h1>{account.name}</h1>
      <div className="card">
        <p>
          {account.types.join(' · ')} · {account.status} ·{' '}
          {account.taxId
            ? `${account.taxId}${account.taxBranch ? ` (${account.taxBranch})` : ''}`
            : 'No tax ID'}
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
            <th>Phone / Line</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No contacts yet — add one below.
              </td>
            </tr>
          )}
          {contacts.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name} {p.isPrimary && <span className="badge">primary</span>}
              </td>
              <td>{p.position}</td>
              <td>{p.email}</td>
              <td>
                {p.mobile ?? p.phone}
                {p.lineId ? ` · Line: ${p.lineId}` : ''}
              </td>
              <td>{p.decisionRole?.replace('_', ' ') ?? ''}</td>
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
            <input name="name" required maxLength={255} />
          </label>
          <label>
            Position
            <input name="position" maxLength={255} />
          </label>
          <label>
            Department
            <input name="department" maxLength={255} />
          </label>
          <label>
            Email
            <input name="email" type="email" maxLength={254} />
          </label>
          <label>
            Phone
            <input name="phone" maxLength={50} />
          </label>
          <label>
            Mobile
            <input name="mobile" maxLength={50} />
          </label>
          <label>
            Line ID
            <input name="lineId" maxLength={100} />
          </label>
          <label>
            Decision role
            <select name="decisionRole" defaultValue="">
              <option value="">—</option>
              <option value="technical">Technical</option>
              <option value="commercial">Commercial</option>
              <option value="decision_maker">Decision maker</option>
            </select>
          </label>
          <label style={{ flexDirection: 'row' as const, alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" name="isPrimary" />
            Primary contact
          </label>
          <button>Add contact</button>
        </form>
      </div>

      <h2>
        Meetings{' '}
        <span className="muted" style={{ fontWeight: 'normal', fontSize: '0.9rem' }}>
          — {meetingHours} h logged with this account
        </span>
      </h2>
      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Hours</th>
            <th>Projects</th>
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
              <td>{m.meetingDate}</td>
              <td>{m.title}</td>
              <td>{m.durationHours ?? '—'}</td>
              <td>
                {m.projects.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <Link href={`/projects/${p.id}`}>{p.name}</Link>
                  </span>
                ))}
              </td>
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
            <input name="name" required maxLength={255} />
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
            Expected amount ({account.defaultCurrency})
            <input name="expectedAmount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <button>Create project</button>
        </form>
      </div>
    </>
  )
}
