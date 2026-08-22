// Users — create, deactivate, role, phone_mobile (prints as the quotation
// salesperson). Roles: ceo / finance / sales_engineer / sales_manager —
// stored, not enforced in Phase 1 except expenses (02 §3.4).
import { requireSessionOrRedirect, isManager } from '@/lib/session'
import { listUsers } from '@/lib/data/admin'
import { setUserActiveAction, setUserRoleAction } from '../actions'

export const dynamic = 'force-dynamic'

const ROLES = ['sales_engineer', 'sales_manager', 'finance', 'ceo'] as const

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
              <td>
                {manager && u.id !== session.userId ? (
                  <form action={setUserRoleAction} style={{ display: 'flex', gap: '0.25rem' }}>
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <button className="quiet">Set</button>
                  </form>
                ) : (
                  u.role.replace('_', ' ')
                )}
              </td>
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
