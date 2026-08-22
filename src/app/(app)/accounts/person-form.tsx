// Shared contact create/edit form.
import type { PersonDto } from '@/lib/data/accounts'

export function PersonForm({
  action,
  accountId,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>
  accountId: number
  initial?: PersonDto
  submitLabel: string
}) {
  return (
    <form className="stack" action={action}>
      <input type="hidden" name="accountId" value={accountId} />
      {initial && <input type="hidden" name="personId" value={initial.id} />}
      <label>
        Name
        <input name="name" required maxLength={255} defaultValue={initial?.name ?? ''} />
      </label>
      <label>
        Position
        <input name="position" maxLength={255} defaultValue={initial?.position ?? ''} />
      </label>
      <label>
        Department
        <input name="department" maxLength={255} defaultValue={initial?.department ?? ''} />
      </label>
      <label>
        Email
        <input name="email" type="email" maxLength={254} defaultValue={initial?.email ?? ''} />
      </label>
      <label>
        Phone
        <input name="phone" maxLength={50} defaultValue={initial?.phone ?? ''} />
      </label>
      <label>
        Mobile
        <input name="mobile" maxLength={50} defaultValue={initial?.mobile ?? ''} />
      </label>
      <label>
        Line ID
        <input name="lineId" maxLength={100} defaultValue={initial?.lineId ?? ''} />
      </label>
      <label>
        Decision role
        <select name="decisionRole" defaultValue={initial?.decisionRole ?? ''}>
          <option value="">—</option>
          <option value="technical">Technical</option>
          <option value="commercial">Commercial</option>
          <option value="decision_maker">Decision maker</option>
        </select>
      </label>
      <label style={{ flexDirection: 'row' as const, alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" name="isPrimary" defaultChecked={initial?.isPrimary} />
        Primary contact
      </label>
      <button>{submitLabel}</button>
    </form>
  )
}
