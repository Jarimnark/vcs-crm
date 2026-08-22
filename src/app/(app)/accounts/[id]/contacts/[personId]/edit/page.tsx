import { notFound } from 'next/navigation'
import { requireSessionOrRedirect } from '@/lib/session'
import { getAccount, getPerson } from '@/lib/data/accounts'
import { PersonForm } from '../../../../person-form'
import { updatePersonAction } from '../../../../actions'

export const dynamic = 'force-dynamic'

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>
}) {
  await requireSessionOrRedirect()
  const { id, personId } = await params
  const accountId = Number(id)
  const pid = Number(personId)
  if (!Number.isInteger(accountId) || !Number.isInteger(pid)) notFound()
  const [account, person] = await Promise.all([getAccount(accountId), getPerson(pid)])
  if (!account || !person || person.accountId !== accountId) notFound()

  return (
    <>
      <h1>
        Edit contact — <span className="muted">{account.name}</span>
      </h1>
      <div className="card">
        <PersonForm
          action={updatePersonAction}
          accountId={accountId}
          initial={person}
          submitLabel="Save changes"
        />
      </div>
    </>
  )
}
