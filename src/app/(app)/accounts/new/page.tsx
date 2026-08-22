import { requireSessionOrRedirect } from '@/lib/session'
import { AccountForm } from '../account-form'
import { createAccountAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NewAccountPage() {
  await requireSessionOrRedirect()
  return (
    <>
      <h1>New account</h1>
      <div className="card">
        <AccountForm action={createAccountAction} submitLabel="Create account" />
      </div>
    </>
  )
}
