// Note snippets — reusable paragraphs, e.g. the Hazardous Substances import-
// permission text that recurs on restricted-chemical lead times.
import { requireSessionOrRedirect } from '@/lib/session'
import { listNoteSnippets } from '@/lib/data/admin'
import { addNoteSnippetAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function SnippetsPage() {
  await requireSessionOrRedirect()
  const snippets = await listNoteSnippets()

  return (
    <>
      <h1>Note snippets</h1>
      {snippets.length === 0 && <p className="muted">None yet.</p>}
      {snippets.map((s) => (
        <div className="card" key={s.id}>
          <strong>{s.title}</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{s.body}</p>
        </div>
      ))}

      <h2>New snippet</h2>
      <div className="card">
        <form className="stack" action={addNoteSnippetAction}>
          <label>
            Title
            <input name="title" required maxLength={200} />
          </label>
          <label>
            Body
            <textarea name="body" rows={5} required maxLength={5000} />
          </label>
          <button>Add snippet</button>
        </form>
      </div>
    </>
  )
}
