import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getAccount, listPeople } from '@/lib/data/accounts'
import { accountMeetingHours, listMeetingsForAccount } from '@/lib/data/meetings'
import { PersonForm } from '../person-form'
import { createPersonAction } from '../actions'

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
      <div className="toolbar">
        <h1>{account.name}</h1>
        <span>
          <Link className="button" href={`/projects/new?account=${account.id}`}>
            + New project
          </Link>{' '}
          <Link className="button" href={`/accounts/${account.id}/edit`}>
            Edit
          </Link>
        </span>
      </div>
      <div className="card">
        <p>
          {account.types.join(' · ')} · {account.status}
          {account.phone ? ` · ☎ ${account.phone}` : ''} ·{' '}
          {account.taxId
            ? `${account.taxId}${account.taxBranch ? ` (${account.taxBranch})` : ''}`
            : 'No tax ID'}
        </p>
        {account.industry && <p className="muted">{account.industry}</p>}
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
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
              <td>
                <Link href={`/accounts/${account.id}/contacts/${p.id}/edit`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>New contact</h2>
      <div className="card">
        <PersonForm action={createPersonAction} accountId={account.id} submitLabel="Add contact" />
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
                No meetings logged — <Link href="/meetings/new">log one</Link>.
              </td>
            </tr>
          )}
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{m.meetingDate}</td>
              <td>
                <Link href={`/meetings/${m.id}`}>{m.title}</Link>
              </td>
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
    </>
  )
}
