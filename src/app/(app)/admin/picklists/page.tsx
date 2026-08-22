// One generic editor for all picklist kinds — six now: lost_reason dropped,
// free text instead (ADR-0046 B9).
import { requireSessionOrRedirect } from '@/lib/session'
import { listPicklist, PICKLIST_KINDS } from '@/lib/data/admin'
import type { PicklistKind } from '@/db/schema'
import { addPicklistItemAction, setPicklistActiveAction } from '../actions'

export const dynamic = 'force-dynamic'

const LABELS: Record<PicklistKind, string> = {
  incoterm: 'Incoterms',
  unit: 'Units',
  country: 'Countries',
  document_type: 'Document types',
  task_type: 'Task types',
  lead_source: 'Lead sources',
}

export default async function PicklistsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  await requireSessionOrRedirect()
  const { kind: rawKind } = await searchParams
  const kind: PicklistKind = (PICKLIST_KINDS as readonly string[]).includes(rawKind ?? '')
    ? (rawKind as PicklistKind)
    : 'incoterm'
  const items = await listPicklist(kind)

  return (
    <>
      <h1>Picklists</h1>
      <p>
        {PICKLIST_KINDS.map((k) => (
          <a key={k} href={`/admin/picklists?kind=${k}`} style={{ marginRight: '0.75rem' }}>
            {k === kind ? <strong>{LABELS[k]}</strong> : LABELS[k]}
          </a>
        ))}
      </p>

      <table className="list">
        <thead>
          <tr>
            <th>Code</th>
            <th>Label</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                Empty — add values below.
              </td>
            </tr>
          )}
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.code}</td>
              <td>{i.label}</td>
              <td>{i.isActive ? 'yes' : 'no'}</td>
              <td>
                <form action={setPicklistActiveAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="active" value={String(!i.isActive)} />
                  <button className="quiet">{i.isActive ? 'Retire' : 'Activate'}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add to {LABELS[kind]}</h2>
      <div className="card">
        <form className="stack" action={addPicklistItemAction}>
          <input type="hidden" name="kind" value={kind} />
          <label>
            Label
            <input name="label" required maxLength={255} />
          </label>
          <label>
            Code (optional — defaults to the label)
            <input name="code" maxLength={50} />
          </label>
          <button>Add</button>
        </form>
      </div>
    </>
  )
}
