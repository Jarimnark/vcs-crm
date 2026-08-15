import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { listProjects, PROGRESS_STEPS } from '@/lib/data/projects'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  await requireSessionOrRedirect()
  const projects = await listProjects()

  return (
    <>
      <h1>Projects</h1>
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
          {projects.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No projects yet — create one from an account page.
              </td>
            </tr>
          )}
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/projects/${p.id}`}>{p.name}</Link>
              </td>
              <td>
                <Link href={`/accounts/${p.accountId}`}>{p.accountName}</Link>
              </td>
              <td>{p.type}</td>
              <td>
                {p.progress}% <span className="muted">{PROGRESS_STEPS[p.progress] ?? ''}</span>
              </td>
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
    </>
  )
}
