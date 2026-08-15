// Users — create, deactivate, role, phone_mobile (printed as the quotation
// salesperson). Creation goes through Better Auth (scripts/seed.ts or a
// manager using the sign-up API with ALLOW_SIGNUP=true).
import { requireSessionOrRedirect, isManager } from '@/lib/session'
import { listUsers } from '@/lib/data/admin'
import { setUserActiveAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await requireSessionOrRedirect()
  const users = await listUsers()
  const manager = isManager(session)

  return (
    <>
      <h1>Users</h1>
      <table className="list">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Mobile</th>
            <th>Active</th>
            {manager && <th></th>}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.phoneMobile}</td>
              <td>{u.active ? 'yes' : 'no'}</td>
              {manager && (
                <td>
                  {u.id !== session.userId && (
                    <form action={setUserActiveAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={String(!u.active)} />
                      <button className="quiet">{u.active ? 'Deactivate' : 'Activate'}</button>
                    </form>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!manager && <p className="muted">Manager role is required to change users.</p>}
    </>
  )
}
