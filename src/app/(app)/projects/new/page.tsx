import { requireSessionOrRedirect } from '@/lib/session'
import { listAccountOptions } from '@/lib/data/options'
import { createProjectAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>
}) {
  await requireSessionOrRedirect()
  const { account } = await searchParams
  const accounts = await listAccountOptions()
  const preselect = Number(account)

  return (
    <>
      <h1>New project</h1>
      <div className="card">
        <form className="stack" action={createProjectAction}>
          <label>
            Account
            <select name="accountId" defaultValue={Number.isInteger(preselect) ? preselect : ''}>
              <option value="">— new account (type the name below) —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            …or new account name (created inline — details can be added later)
            <input name="newAccountName" maxLength={255} />
          </label>
          <label>
            Project name
            <input name="name" required maxLength={255} />
          </label>
          <label>
            Type
            <select name="type" defaultValue="consumable">
              <option value="consumable">Consumable</option>
              <option value="equipment">Equipment</option>
              <option value="part">Part</option>
              <option value="service">Service</option>
            </select>
          </label>
          <label>
            Expected amount (THB)
            <input name="expectedAmount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" />
          </label>
          <label>
            Expected close date
            <input name="expectedCloseDate" type="date" />
          </label>
          <button>Create project</button>
        </form>
      </div>
    </>
  )
}
