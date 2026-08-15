import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getProject, PROGRESS_STEPS } from '@/lib/data/projects'
import { listQuotationsForProject } from '@/lib/data/quotations'
import { formatMoney } from '@/lib/money'
import { setProgressAction, setStatusAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const projectId = Number(id)
  if (!Number.isInteger(projectId)) notFound()

  const project = await getProject(projectId)
  if (!project) notFound()
  const quotations = await listQuotationsForProject(projectId)

  return (
    <>
      <h1>{project.name}</h1>
      <div className="card">
        <p>
          <Link href={`/accounts/${project.accountId}`}>{project.accountName}</Link> ·{' '}
          {project.type} · <span className={`badge ${project.status}`}>{project.status}</span>
          {project.status === 'lost' && project.lostReason && (
            <span className="muted"> — {project.lostReason}</span>
          )}
        </p>
        <p>
          Expected:{' '}
          {project.expectedAmount != null
            ? `${formatMoney(project.expectedAmount)} ${project.currency}`
            : '—'}
        </p>
      </div>

      <h2>Progress — {project.progress}% ({PROGRESS_STEPS[project.progress] ?? '—'})</h2>
      <div className="card">
        {/* Progress and status are independent (ADR-0028). Progress freezes on loss. */}
        <form action={setProgressAction} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input type="hidden" name="projectId" value={project.id} />
          {Object.entries(PROGRESS_STEPS).map(([step, label]) => (
            <button
              key={step}
              name="progress"
              value={step}
              className={Number(step) === project.progress ? undefined : 'quiet'}
              disabled={project.status === 'lost'}
              title={label}
            >
              {step}
            </button>
          ))}
        </form>
      </div>

      <h2>Status</h2>
      <div className="card">
        <form className="stack" action={setStatusAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <label>
            Status
            <select name="status" defaultValue={project.status}>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </label>
          <label>
            Lost reason (required when lost)
            <input name="lostReason" defaultValue={project.lostReason ?? ''} />
          </label>
          <button>Update status</button>
        </form>
      </div>

      <h2>Quotations</h2>
      <table className="list">
        <thead>
          <tr>
            <th>Number</th>
            <th>Date</th>
            <th>Status</th>
            <th className="num">Grand total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {quotations.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No quotations yet.
              </td>
            </tr>
          )}
          {quotations.map((q) => (
            <tr key={q.id}>
              <td>
                <Link href={`/quotations/${q.id}`}>
                  {q.number}
                  {q.revision > 0 ? `-R${q.revision}` : ''}
                </Link>
              </td>
              <td>{q.date}</td>
              <td>
                <span className="badge">{q.status}</span>
              </td>
              <td className="num">
                {q.grandTotal != null ? `${formatMoney(q.grandTotal)} ${q.currency}` : '—'}
              </td>
              <td>
                <a href={`/api/quotations/${q.id}/pdf`} target="_blank">
                  PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
