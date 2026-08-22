import { requireSessionOrRedirect } from '@/lib/session'
import { listAccountOptions, listPersonOptions, listProjectOptions } from '@/lib/data/options'
import { MeetingForm } from '../meeting-form'
import { createMeetingAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NewMeetingPage() {
  await requireSessionOrRedirect()
  const [accounts, projects, people] = await Promise.all([
    listAccountOptions(),
    listProjectOptions(),
    listPersonOptions(),
  ])

  return (
    <>
      <h1>Log meeting</h1>
      <div className="card">
        <MeetingForm
          action={createMeetingAction}
          options={{ accounts, projects, people }}
          showExpense
          submitLabel="Log meeting"
        />
      </div>
    </>
  )
}
