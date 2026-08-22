import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getProject } from '@/lib/data/projects'
import { listPeople } from '@/lib/data/accounts'
import { updateProjectAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const projectId = Number(id)
  if (!Number.isInteger(projectId)) notFound()
  const project = await getProject(projectId)
  if (!project) notFound()
  const contacts = await listPeople(project.accountId)

  return (
    <>
      <h1>Edit project</h1>
      <div className="card">
        <form className="stack" action={updateProjectAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <label>
            Name
            <input name="name" required maxLength={255} defaultValue={project.name} />
          </label>
          <label>
            Primary contact
            <select name="primaryPersonId" defaultValue={''}>
              <option value="">—</option>
              {contacts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expected amount ({project.currency})
            <input
              name="expectedAmount"
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              defaultValue={project.expectedAmount ?? ''}
            />
          </label>
          <label>
            Expected close date
            <input
              name="expectedCloseDate"
              type="date"
              defaultValue={project.expectedCloseDate ?? ''}
            />
          </label>
          <button>Save changes</button>
        </form>
      </div>
      <p className="muted">
        Type and account cannot change after creation; progress and status are managed on the
        project page.
      </p>
    </>
  )
}
