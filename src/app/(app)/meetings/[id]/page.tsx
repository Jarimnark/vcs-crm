import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getMeeting } from '@/lib/data/meetings'

export const dynamic = 'force-dynamic'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const meetingId = Number(id)
  if (!Number.isInteger(meetingId)) notFound()
  const m = await getMeeting(meetingId)
  if (!m) notFound()

  return (
    <>
      <div className="toolbar">
        <h1>{m.title}</h1>
        <Link className="button" href={`/meetings/${m.id}/edit`}>
          Edit
        </Link>
      </div>
      <div className="card">
        <p>
          {m.meetingDate}
          {m.startTime ? ` · ${m.startTime.slice(0, 5)}` : ''} ·{' '}
          {m.durationHours != null ? `${m.durationHours} h` : 'no duration'} ·{' '}
          {m.mode.replace('_', ' ')} · <span className="badge">{m.status.replace('_', ' ')}</span>
        </p>
        <p>
          Account:{' '}
          {m.accountId ? (
            <Link href={`/accounts/${m.accountId}`}>{m.accountName}</Link>
          ) : (
            <span className="muted">none</span>
          )}
          {m.location ? ` · ${m.location}` : ''}
        </p>
        {m.projects.length > 0 && (
          <p>
            Projects:{' '}
            {m.projects.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <Link href={`/projects/${p.id}`}>{p.name}</Link>
              </span>
            ))}
          </p>
        )}
        {m.attendees.length > 0 && (
          <p>
            Attendees:{' '}
            {m.attendees.map((a, i) => (
              <span key={`${a.kind}-${a.name}-${i}`}>
                {i > 0 && ', '}
                {a.name}
                {a.kind === 'user' ? ' (VCS)' : ''}
              </span>
            ))}
          </p>
        )}
        <p className="muted">Logged by {m.createdByName}</p>
      </div>
      {m.agenda && (
        <div className="card">
          <strong>Agenda</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{m.agenda}</p>
        </div>
      )}
      {m.outcomeNotes && (
        <div className="card">
          <strong>Outcome</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{m.outcomeNotes}</p>
        </div>
      )}
    </>
  )
}
