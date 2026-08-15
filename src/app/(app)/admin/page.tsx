import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'

export const dynamic = 'force-dynamic'

// The four hand-built admin screens (docs/03-tech-stack.md §7.2).
export default async function AdminPage() {
  await requireSessionOrRedirect()
  return (
    <>
      <h1>Admin</h1>
      <div className="card">
        <p>
          <Link href="/admin/picklists">Picklists</Link> — all seven kinds, one editor
        </p>
        <p>
          <Link href="/admin/company">Company settings</Link> — the quotation header block
        </p>
        <p>
          <Link href="/admin/snippets">Note snippets</Link> — reusable paragraphs (lead times,
          regulatory notes)
        </p>
        <p>
          <Link href="/admin/users">Users</Link> — create, deactivate, role, mobile
        </p>
      </div>
    </>
  )
}
