import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getAccount } from '@/lib/data/accounts'
import { AccountForm } from '../../account-form'
import { updateAccountAction } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionOrRedirect()
  const { id } = await params
  const accountId = Number(id)
  if (!Number.isInteger(accountId)) notFound()
  const account = await getAccount(accountId)
  if (!account) notFound()

  return (
    <>
      <h1>Edit account</h1>
      <div className="card">
        <AccountForm action={updateAccountAction} initial={account} submitLabel="Save changes" />
      </div>
    </>
  )
}
