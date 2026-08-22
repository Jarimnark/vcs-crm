// Meetings — logged against an account, optionally covering several projects
// or none (A4). Hours are reported per account, never per project.
import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listMeetings } from '@/lib/data/meetings'
import { listAccounts } from '@/lib/data/accounts'
import { listProjects } from '@/lib/data/projects'
import { createMeetingAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  await requireSessionOrRedirect()
  const [meetings, accounts, projects] = await Promise.all([
    listMeetings(),
    listAccounts(),
    listProjects(),
  ])
  const openProjects = projects.filter((p) => p.status === 'open')

  return (
    <>
      <h1>Meetings</h1>
      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Account</th>
            <th>Duration</th>
            <th>Projects</th>
            <th>Notes</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {meetings.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No meetings logged yet.
              </td>
            </tr>
          )}
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{m.date}</td>
              <td>
                <Link href={`/accounts/${m.accountId}`}>{m.accountName}</Link>
              </td>
              <td>{m.durationMinutes != null ? `${m.durationMinutes} min` : '—'}</td>
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

      <h2>Log meeting</h2>
      <div className="card">
        <form className="stack" action={createMeetingAction}>
          <label>
            Account
            <select name="accountId" required defaultValue="">
              <option value="" disabled>
                Select an account…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input name="date" type="date" required />
          </label>
          <label>
            Duration (minutes)
            <input name="durationMinutes" type="number" min={0} max={1440} step={5} />
          </label>
          <label>
            Projects covered (optional — must belong to the selected account)
            <select name="projectIds" multiple size={Math.min(8, Math.max(3, openProjects.length))}>
              {openProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.accountName} — {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" rows={3} maxLength={5000} />
          </label>
          <button>Log meeting</button>
        </form>
      </div>
    </>
  )
}
