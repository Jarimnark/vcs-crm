import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getProject, progressDefinition, PROGRESS_STEPS } from '@/lib/data/projects'
import { listQuotationsForProject } from '@/lib/data/quotations'
import { listOrdersForProject, projectActualRevenue } from '@/lib/data/orders'
import { formatMoney } from '@/lib/money'
import { StatusForm } from './status-form'
import {
  createOrderAction,
  setFollowupAction,
  setProgressAction,
  setStatusAction,
  voidOrderAction,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const projectId = Number(id)
  if (!Number.isInteger(projectId)) notFound()

  const project = await getProject(projectId)
  if (!project) notFound()
  const [quotations, orders, actualRevenue] = await Promise.all([
    listQuotationsForProject(projectId),
    listOrdersForProject(projectId),
    projectActualRevenue(projectId),
  ])

  return (
    <>
      <div className="toolbar">
        <h1>{project.name}</h1>
        <Link className="button" href={`/projects/${project.id}/edit`}>
          Edit
        </Link>
      </div>
      <div className="card">
        <p>
          <Link href={`/accounts/${project.accountId}`}>{project.accountName}</Link> ·{' '}
          {project.type} · <span className={`badge ${project.status}`}>{project.status}</span>
          {project.status === 'lost' && project.lostReason && (
            <span className="muted">
              {' '}
              — {project.lostReason}
              {project.competitor ? ` (to ${project.competitor})` : ''}
            </span>
          )}
        </p>
        {/* Three money figures, never conflated (ADR-0030) */}
        <p>
          Expected:{' '}
          {project.expectedAmount != null
            ? `${formatMoney(project.expectedAmount)} ${project.currency}`
            : '—'}{' '}
          · Quoted:{' '}
          {project.quotedValue != null
            ? `${formatMoney(project.quotedValue)} ${project.currency}`
            : '—'}{' '}
          · Ordered: {formatMoney(actualRevenue)} {project.currency}
        </p>
      </div>

      <h2>Progress — {project.progress}%</h2>
      <div className="card">
        {/* Fixed steps with their definitions (review round 1); backwards
            moves are normal and logged. Progress freezes on loss. */}
        <form action={setProgressAction} className="progress-steps">
          <input type="hidden" name="projectId" value={project.id} />
          {PROGRESS_STEPS.map((step) => (
            <div key={step} className={`step-row${step === project.progress ? ' current' : ''}`}>
              <button
                name="progress"
                value={step}
                className={step === project.progress ? undefined : 'quiet'}
                disabled={project.status === 'lost'}
              >
                {step}%
              </button>
              <span className="step-def">{progressDefinition(step, project.type)}</span>
            </div>
          ))}
        </form>
      </div>

      <h2>Status</h2>
      <div className="card">
        {/* Set by hand — never automatic (ADR-0046 B7/B10). Won asks for the
            real amount and records it as the first Order (ADR-0030). */}
        <StatusForm
          action={setStatusAction}
          projectId={project.id}
          currentStatus={project.status}
          projectType={project.type}
          lostReason={project.lostReason}
          competitor={project.competitor}
        />
      </div>

      {project.type === 'consumable' && (
        <>
          <h2>Reorder follow-up</h2>
          <div className="card">
            {/* Flow E: the engineer sets the rhythm; completing a follow-up
                schedules the next; an order resets the clock; pause is
                first-class. */}
            <form className="stack" action={setFollowupAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <label>
                Follow-up interval (days)
                <input
                  name="intervalDays"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={project.followupIntervalDays ?? ''}
                />
              </label>
              <label style={{ flexDirection: 'row' as const, alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" name="paused" defaultChecked={project.followupPaused} />
                Pause recurrence (account dormant)
              </label>
              <button>Save follow-up settings</button>
            </form>
            {project.status !== 'won' && (
              <p className="muted">Follow-up tasks generate once the project is Won.</p>
            )}
          </div>
        </>
      )}

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
                  {q.quotationNo ?? 'Draft'}
                  {q.revision > 1 ? `-R${q.revision}` : ''}
                </Link>
              </td>
              <td>{q.quotationDate}</td>
              <td>
                <span className="badge">{q.status}</span>
              </td>
              <td className="num">
                {formatMoney(q.grandTotal)} {q.currency}
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

      <h2>Orders</h2>
      <table className="list">
        <thead>
          <tr>
            <th>PO number</th>
            <th>Date</th>
            <th>Status</th>
            <th className="num">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No orders yet — log the PO below when it arrives.
              </td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id} style={o.isVoid ? { opacity: 0.5 } : undefined}>
              <td>
                {o.poNumber} {o.isVoid && <span className="badge lost">void</span>}
              </td>
              <td>{o.poDate}</td>
              <td>{o.status}</td>
              <td className="num">
                {formatMoney(o.amount)} {o.currency}
              </td>
              <td>
                {!o.isVoid && (
                  <form action={voidOrderAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="quiet">Void</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="card">
        {/* Three fields plus a date, deliberately small (Flow E) */}
        <form className="stack" action={createOrderAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <label>
            PO number
            <input name="poNumber" required maxLength={100} />
          </label>
          <label>
            PO date
            <input name="poDate" type="date" required />
          </label>
          <label>
            Amount ({project.currency})
            <input name="amount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <button>Log order</button>
        </form>
      </div>
    </>
  )
}
