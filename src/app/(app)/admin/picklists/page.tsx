// One generic editor for all seven picklist kinds — the single `picklist`
// table with a `kind` column is why this is one screen, not seven.
import { requireSessionOrRedirect } from '@/lib/session'
import { listPicklist, PICKLIST_KINDS, type PicklistKind } from '@/lib/data/admin'
import { addPicklistItemAction, setPicklistActiveAction } from '../actions'

export const dynamic = 'force-dynamic'

const LABELS: Record<PicklistKind, string> = {
  incoterm: 'Incoterms',
  unit: 'Units',
  country: 'Countries',
  document_type: 'Document types',
  task_type: 'Task types',
  lead_source: 'Lead sources',
  lost_reason: 'Lost reasons',
}

export default async function PicklistsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  await requireSessionOrRedirect()
  const { kind: rawKind } = await searchParams
  const kind: PicklistKind = PICKLIST_KINDS.includes(rawKind as PicklistKind)
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
            <th>Value</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Empty — seed values below.
              </td>
            </tr>
          )}
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.value}</td>
              <td>{i.active ? 'yes' : 'no'}</td>
              <td>
                <form action={setPicklistActiveAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="active" value={String(!i.active)} />
                  <button className="quiet">{i.active ? 'Deactivate' : 'Activate'}</button>
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
            Value
            <input name="value" required maxLength={200} />
          </label>
          <button>Add</button>
        </form>
      </div>
    </>
  )
}
