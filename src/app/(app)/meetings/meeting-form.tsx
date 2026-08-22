'use client'

// Shared create/edit meeting form. The account selection filters the project
// and attendee lists client-side (review round 1: selecting from every
// project in the system was confusing). Only id+name fields arrive as props
// (G2).
import { useState } from 'react'

export interface MeetingFormOptions {
  accounts: { id: number; name: string }[]
  projects: { id: number; name: string; accountId: number; status: string }[]
  people: { id: number; name: string; accountId: number }[]
}

export interface MeetingFormValues {
  title: string
  accountId: number | null
  status: string
  meetingDate: string
  startTime: string | null
  durationHours: string | null
  mode: string
  location: string | null
  agenda: string | null
  outcomeNotes: string | null
  projectIds: number[]
  attendeePersonIds: number[]
}

export function MeetingForm({
  action,
  options,
  initial,
  showExpense,
  submitLabel,
  meetingId,
}: {
  action: (formData: FormData) => Promise<void>
  options: MeetingFormOptions
  initial?: MeetingFormValues
  showExpense?: boolean
  submitLabel: string
  meetingId?: number
}) {
  const [accountId, setAccountId] = useState<number | null>(initial?.accountId ?? null)
  const accountProjects = options.projects.filter((p) => p.accountId === accountId)
  const accountPeople = options.people.filter((p) => p.accountId === accountId)

  return (
    <form className="stack" action={action}>
      {meetingId != null && <input type="hidden" name="meetingId" value={meetingId} />}
      <label>
        Title
        <input name="title" required maxLength={255} defaultValue={initial?.title ?? ''} />
      </label>
      <label>
        Account (optional — a relationship visit may have none)
        <select
          name="accountId"
          value={accountId ?? ''}
          onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— no account —</option>
          {options.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date
        <input name="meetingDate" type="date" required defaultValue={initial?.meetingDate ?? ''} />
      </label>
      <label>
        Start time
        <input name="startTime" type="time" defaultValue={initial?.startTime ?? ''} />
      </label>
      <label>
        Duration (hours, e.g. 1.5)
        <input
          name="durationHours"
          inputMode="decimal"
          pattern="\d{1,2}(\.\d{1,2})?"
          defaultValue={initial?.durationHours ?? ''}
        />
      </label>
      <label>
        Mode
        <select name="mode" defaultValue={initial?.mode ?? 'client_site'}>
          <option value="client_site">Client site</option>
          <option value="office">Our office</option>
          <option value="online">Online</option>
          <option value="phone">Phone</option>
        </select>
      </label>
      <label>
        Status
        <select name="status" defaultValue={initial?.status ?? 'completed'}>
          <option value="completed">Completed</option>
          <option value="planned">Planned</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
      </label>
      <label>
        Location
        <input name="location" maxLength={255} defaultValue={initial?.location ?? ''} />
      </label>

      {accountId == null ? (
        <p className="muted">Select an account to link projects and attendees.</p>
      ) : (
        <>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Projects covered (this account&apos;s projects only)
            </span>
            {accountProjects.length === 0 && <p className="muted">No projects on this account.</p>}
            <div className="chips">
              {accountProjects.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    name="projectIds"
                    value={p.id}
                    defaultChecked={initial?.projectIds.includes(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              External attendees (this account&apos;s contacts)
            </span>
            {accountPeople.length === 0 && <p className="muted">No contacts on this account.</p>}
            <div className="chips">
              {accountPeople.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    name="attendeePersonIds"
                    value={p.id}
                    defaultChecked={initial?.attendeePersonIds.includes(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <label>
        Agenda
        <textarea name="agenda" rows={2} maxLength={5000} defaultValue={initial?.agenda ?? ''} />
      </label>
      <label>
        Outcome
        <textarea
          name="outcomeNotes"
          rows={3}
          maxLength={5000}
          defaultValue={initial?.outcomeNotes ?? ''}
        />
      </label>

      {showExpense && (
        <div className="card" style={{ background: 'var(--bg)', marginBottom: 0 }}>
          💰 Add expense? <span className="muted">(optional — leave blank to skip)</span>
          <label>
            Category
            <select name="expenseCategory" defaultValue="">
              <option value="">— skip —</option>
              <option value="travel">Travel</option>
              <option value="fuel">Fuel</option>
              <option value="accommodation">Accommodation</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Amount (THB)
            <input name="expenseAmount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            🔒 Only you and your manager can see this.
          </p>
        </div>
      )}

      <button>{submitLabel}</button>
    </form>
  )
}
