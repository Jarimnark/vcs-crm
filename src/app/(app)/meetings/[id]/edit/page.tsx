import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getMeeting } from '@/lib/data/meetings'
import { listAccountOptions, listPersonOptions, listProjectOptions } from '@/lib/data/options'
import { MeetingForm } from '../../meeting-form'
import { updateMeetingAction } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const meetingId = Number(id)
  if (!Number.isInteger(meetingId)) notFound()
  const m = await getMeeting(meetingId)
  if (!m) notFound()

  const [accounts, projects, people] = await Promise.all([
    listAccountOptions(),
    listProjectOptions(),
    listPersonOptions(),
  ])

  return (
    <>
      <h1>Edit meeting</h1>
      <div className="card">
        <MeetingForm
          action={updateMeetingAction}
          options={{ accounts, projects, people }}
          meetingId={m.id}
          initial={{
            title: m.title,
            accountId: m.accountId,
            status: m.status,
            meetingDate: m.meetingDate,
            startTime: m.startTime ? m.startTime.slice(0, 5) : null,
            durationHours: m.durationHours,
            mode: m.mode,
            location: m.location,
            agenda: m.agenda,
            outcomeNotes: m.outcomeNotes,
            projectIds: m.projectIds,
            attendeePersonIds: m.attendeePersonIds,
          }}
          submitLabel="Save changes"
        />
      </div>
    </>
  )
}
