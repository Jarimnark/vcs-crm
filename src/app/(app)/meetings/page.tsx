// Meetings (Flow G) — logged against an account, optionally covering several
// of its projects or none. Hours report per account, never per project (N3).
// An optional expense can be captured in the same submit — the one moment
// the receipt is still in the engineer's hand.
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
  const openProjects = projects.filter((p) => p.status === 'open' || p.status === 'won')

  return (
    <>
      <h1>Meetings</h1>
      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Account</th>
            <th>Mode</th>
            <th>Hours</th>
            <th>Projects</th>
            <th>Attendees</th>
          </tr>
        </thead>
        <tbody>
          {meetings.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No meetings logged yet.
              </td>
            </tr>
          )}
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{m.meetingDate}</td>
              <td>
                {m.title} {m.status !== 'completed' && <span className="badge">{m.status}</span>}
              </td>
              <td>
                {m.accountId ? (
                  <Link href={`/accounts/${m.accountId}`}>{m.accountName}</Link>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>{m.mode.replace('_', ' ')}</td>
              <td>{m.durationHours ?? '—'}</td>
              <td>
                {m.projects.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <Link href={`/projects/${p.id}`}>{p.name}</Link>
                  </span>
                ))}
              </td>
              <td className="muted">{m.attendees.map((a) => a.name).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Log meeting</h2>
      <div className="card">
        <form className="stack" action={createMeetingAction}>
          <label>
            Title
            <input name="title" required maxLength={255} />
          </label>
          <label>
            Account (optional — a relationship visit may have none)
            <select name="accountId" defaultValue="">
              <option value="">— no account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input name="meetingDate" type="date" required />
          </label>
          <label>
            Start time
            <input name="startTime" type="time" />
          </label>
          <label>
            Duration (hours, e.g. 1.5)
            <input name="durationHours" inputMode="decimal" pattern="\d{1,2}(\.\d{1,2})?" />
          </label>
          <label>
            Mode
            <select name="mode" defaultValue="client_site">
              <option value="client_site">Client site</option>
              <option value="office">Our office</option>
              <option value="online">Online</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue="completed">
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
            </select>
          </label>
          <label>
            Location
            <input name="location" maxLength={255} />
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
            Agenda
            <textarea name="agenda" rows={2} maxLength={5000} />
          </label>
          <label>
            Outcome
            <textarea name="outcomeNotes" rows={3} maxLength={5000} />
          </label>

          <div
            className="card"
            style={{ background: 'var(--bg)', marginBottom: 0 }}
          >
            💰 Add expense? <span className="muted">(optional — leave blank to skip)</span>
            <label>
              Category
              <select name="expenseCategory" defaultValue="">
                <option value="">— skip —</option>
                <option value="travel">Travel</option>
                <option value="fuel">Fuel</option>
                <option value="accommodation">Accommodation</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Amount (THB)
              <input name="expenseAmount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
            </label>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              🔒 Only you and your manager can see this.
            </p>
          </div>

          <button>Log meeting</button>
        </form>
      </div>
    </>
  )
}
