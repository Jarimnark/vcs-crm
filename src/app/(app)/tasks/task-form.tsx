// Shared task create/edit form (server component). A task may relate to a
// project, an account, and a person — any or none (02 §8.1).
import type { AccountOption, PersonOption, PicklistOption, ProjectOption, UserOption } from '@/lib/data/options'

export interface TaskFormValues {
  title: string
  description: string | null
  typeId: number | null
  status?: string
  dueDate: string | null
  assigneeUserId: string
  projectId: number | null
  accountId: number | null
  personId: number | null
}

export function TaskForm({
  action,
  taskId,
  initial,
  options,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>
  taskId?: number
  initial: TaskFormValues
  options: {
    accounts: AccountOption[]
    projects: ProjectOption[]
    people: PersonOption[]
    users: UserOption[]
    taskTypes: PicklistOption[]
    accountNames: Map<number, string> | Record<number, string>
  }
  submitLabel: string
}) {
  const accountName = (id: number) =>
    options.accountNames instanceof Map
      ? options.accountNames.get(id)
      : options.accountNames[id]

  return (
    <form className="stack" action={action}>
      {taskId != null && <input type="hidden" name="taskId" value={taskId} />}
      <label>
        Title
        <input name="title" required maxLength={255} defaultValue={initial.title} />
      </label>
      <label>
        Description
        <textarea name="description" rows={3} maxLength={5000} defaultValue={initial.description ?? ''} />
      </label>
      <label>
        Type
        <select name="typeId" defaultValue={initial.typeId ?? ''}>
          <option value="">—</option>
          {options.taskTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {initial.status !== undefined && (
        <label>
          Status
          <select name="status" defaultValue={initial.status}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      )}
      <label>
        Due date
        <input name="dueDate" type="date" defaultValue={initial.dueDate ?? ''} />
      </label>
      <label>
        Assignee
        <select name="assigneeUserId" required defaultValue={initial.assigneeUserId}>
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Related project (optional)
        <select name="projectId" defaultValue={initial.projectId ?? ''}>
          <option value="">—</option>
          {options.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {accountName(p.accountId)} — {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Related account (optional)
        <select name="accountId" defaultValue={initial.accountId ?? ''}>
          <option value="">—</option>
          {options.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Related contact (optional)
        <select name="personId" defaultValue={initial.personId ?? ''}>
          <option value="">—</option>
          {options.people.map((p) => (
            <option key={p.id} value={p.id}>
              {accountName(p.accountId)} — {p.name}
            </option>
          ))}
        </select>
      </label>
      <button>{submitLabel}</button>
    </form>
  )
}
