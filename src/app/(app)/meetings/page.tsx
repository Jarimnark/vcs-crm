// Meetings list (Flow G) — search, status filter, pagination.
import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listMeetings } from '@/lib/data/meetings'
import { parsePage } from '@/lib/list'
import { Pagination, SearchBar } from '@/components/list-controls'
import type { MeetingStatus } from '@/db/schema'

export const dynamic = 'force-dynamic'

const STATUSES: MeetingStatus[] = ['planned', 'completed', 'cancelled', 'no_show']

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireSessionOrRedirect()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const status = STATUSES.includes(sp.status as MeetingStatus)
    ? (sp.status as MeetingStatus)
    : undefined
  const result = await listMeetings({ q: q || undefined, status, page: parsePage(sp.page) })

  return (
    <>
      <div className="toolbar">
        <h1>Meetings</h1>
        <Link className="button" href="/meetings/new">
          + Log meeting
        </Link>
      </div>

      <SearchBar action="/meetings" q={q} placeholder="Search title or account…">
        <select name="status" defaultValue={status ?? ''}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </SearchBar>

      <table className="list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Account</th>
            <th>Mode</th>
            <th>Hours</th>
            <th>Projects</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No meetings found.
              </td>
            </tr>
          )}
          {result.rows.map((m) => (
            <tr key={m.id}>
              <td>{m.meetingDate}</td>
              <td>
                <Link href={`/meetings/${m.id}`}>{m.title}</Link>{' '}
                {m.status !== 'completed' && <span className="badge">{m.status.replace('_', ' ')}</span>}
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
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        paged={result}
        basePath="/meetings"
        params={{ ...(q ? { q } : {}), ...(status ? { status } : {}) }}
      />
    </>
  )
}
