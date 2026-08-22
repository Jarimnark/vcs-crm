import { requireSessionOrRedirect } from '@/lib/session'
import {
  listAccountOptions,
  listPersonOptions,
  listPicklistOptions,
  listProjectOptions,
  listUserOptions,
} from '@/lib/data/options'
import { TaskForm } from '../task-form'
import { createTaskAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NewTaskPage() {
  const session = await requireSessionOrRedirect()
  const [accounts, projects, people, users, taskTypes] = await Promise.all([
    listAccountOptions(),
    listProjectOptions(),
    listPersonOptions(),
    listUserOptions(),
    listPicklistOptions('task_type'),
  ])
  const accountNames: Record<number, string> = {}
  for (const a of accounts) accountNames[a.id] = a.name

  return (
    <>
      <h1>New task</h1>
      <div className="card">
        <TaskForm
          action={createTaskAction}
          initial={{
            title: '',
            description: null,
            typeId: null,
            dueDate: null,
            assigneeUserId: session.userId,
            projectId: null,
            accountId: null,
            personId: null,
          }}
          options={{ accounts, projects, people, users, taskTypes, accountNames }}
          submitLabel="Create task"
        />
      </div>
    </>
  )
}
