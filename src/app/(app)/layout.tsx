// Authenticated shell. The redirect here is UX only — the security boundary
// is requireSession() inside every Server Action and Route Handler (G1).
import Link from 'next/link'
import { requireSessionOrRedirect } from '@/lib/session'
import { SignOutButton } from './sign-out-button'

// G5: authenticated routes render dynamically. Nothing user-scoped is cached.
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">VCS CRM</div>
        <nav>
          <Link href="/tasks">My Tasks</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/accounts">Accounts</Link>
          <Link href="/meetings">Meetings</Link>
          <Link href="/expenses">Expenses</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <div className="foot">
          {session.name}
          <br />
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
