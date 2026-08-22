import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listProjects } from '@/lib/data/projects'
import { formatMoney } from '@/lib/money'
import { parsePage } from '@/lib/list'
import { Pagination, SearchBar } from '@/components/list-controls'
import type { ProjectStatus, ProjectType } from '@/db/schema'

export const dynamic = 'force-dynamic'

const STATUSES: ProjectStatus[] = ['open', 'won', 'lost']
const TYPES: ProjectType[] = ['consumable', 'equipment', 'part', 'service']

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>
}) {
  await requireSessionOrRedirect()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const status = STATUSES.includes(sp.status as ProjectStatus)
    ? (sp.status as ProjectStatus)
    : undefined
  const type = TYPES.includes(sp.type as ProjectType) ? (sp.type as ProjectType) : undefined
  const result = await listProjects({ q: q || undefined, status, type, page: parsePage(sp.page) })

  return (
    <>
      <div className="toolbar">
        <h1>Projects</h1>
        <Link className="button" href="/projects/new">
          + New project
        </Link>
      </div>

      <SearchBar action="/projects" q={q} placeholder="Search project or account…">
        <select name="status" defaultValue={status ?? ''}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type ?? ''}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </SearchBar>

      <table className="list">
        <thead>
          <tr>
            <th>Project</th>
            <th>Account</th>
            <th>Type</th>
            <th>Progress</th>
            <th>Status</th>
            <th className="num">Expected</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No projects found.
              </td>
            </tr>
          )}
          {result.rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/projects/${p.id}`}>{p.name}</Link>
              </td>
              <td>
                <Link href={`/accounts/${p.accountId}`}>{p.accountName}</Link>
              </td>
              <td>{p.type}</td>
              <td>{p.progress}%</td>
              <td>
                <span className={`badge ${p.status}`}>{p.status}</span>
              </td>
              <td className="num">
                {p.expectedAmount != null ? `${formatMoney(p.expectedAmount)} ${p.currency}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        paged={result}
        basePath="/projects"
        params={{
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
          ...(type ? { type } : {}),
        }}
      />
    </>
  )
}
