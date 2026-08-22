// Shared account create/edit form. Types render as toggle chips (review
// round 1 — the bare checkbox list read badly).
import type { AccountDto } from '@/lib/data/accounts'

const TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  supplier: 'Supplier',
  manufacturer: 'Manufacturer',
  service_provider: 'Service provider',
  logistics: 'Logistics',
}

export function AccountForm({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>
  initial?: AccountDto
  submitLabel: string
}) {
  const checkedTypes = initial?.types ?? ['client']
  return (
    <form className="stack" action={action}>
      {initial && <input type="hidden" name="accountId" value={initial.id} />}
      <label>
        Name
        <input name="name" required maxLength={255} defaultValue={initial?.name ?? ''} />
      </label>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Types — an account plays as many roles as it plays
        </span>
        <div className="chips">
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <label key={value}>
              <input
                type="checkbox"
                name="types"
                value={value}
                defaultChecked={checkedTypes.includes(value as AccountDto['types'][number])}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Status
        <select name="status" defaultValue={initial?.status ?? 'active'}>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label>
        Phone (operations)
        <input name="phone" maxLength={50} defaultValue={initial?.phone ?? ''} />
      </label>
      <label>
        Industry
        <input name="industry" maxLength={100} defaultValue={initial?.industry ?? ''} />
      </label>
      <label>
        Address
        <textarea name="address" rows={3} defaultValue={initial?.address ?? ''} />
      </label>
      <label>
        Tax ID
        <input name="taxId" maxLength={20} defaultValue={initial?.taxId ?? ''} />
      </label>
      <label>
        Branch designation (e.g. Head Office)
        <input name="taxBranch" maxLength={100} defaultValue={initial?.taxBranch ?? ''} />
      </label>
      <label>
        Default payment term
        <input
          name="defaultPaymentTerm"
          maxLength={255}
          defaultValue={initial?.defaultPaymentTerm ?? ''}
        />
      </label>
      <button>{submitLabel}</button>
    </form>
  )
}
