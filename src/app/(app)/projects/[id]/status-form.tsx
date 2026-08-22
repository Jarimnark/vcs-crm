'use client'

// Status form — shows only the fields the chosen status needs: Won asks for
// the real amount (recorded as the first Order) and, for consumables, the
// follow-up interval; Lost asks for reason / competitor / note.
import { useState } from 'react'

export function StatusForm({
  action,
  projectId,
  currentStatus,
  projectType,
  lostReason,
  competitor,
}: {
  action: (formData: FormData) => Promise<void>
  projectId: number
  currentStatus: 'open' | 'won' | 'lost'
  projectType: string
  lostReason: string | null
  competitor: string | null
}) {
  const [status, setStatus] = useState(currentStatus)

  return (
    <form className="stack" action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <label>
        Status
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </label>

      {status === 'won' && currentStatus !== 'won' && (
        <>
          <label>
            Real amount ({'THB'}) — recorded as the first order
            <input name="wonAmount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <label>
            PO number (optional — may follow later)
            <input name="wonPoNumber" maxLength={100} />
          </label>
          <label>
            PO / order date (defaults to today)
            <input name="wonPoDate" type="date" />
          </label>
          {projectType === 'consumable' && (
            <label>
              Follow-up interval (days) — starts the reorder loop
              <input name="wonIntervalDays" type="number" min={1} max={999} placeholder="e.g. 45" />
            </label>
          )}
        </>
      )}

      {status === 'lost' && (
        <>
          <label>
            Lost reason (required — free text)
            <input name="lostReason" required maxLength={255} defaultValue={lostReason ?? ''} />
          </label>
          <label>
            Competitor (if known)
            <input name="competitor" maxLength={255} defaultValue={competitor ?? ''} />
          </label>
          <label>
            Note
            <input name="lostNote" maxLength={1000} />
          </label>
        </>
      )}

      <button>Update status</button>
    </form>
  )
}
