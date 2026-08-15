// G1: every Server Action and Route Handler authenticates first —
// authenticate → authorize → validate, in that order. Render-time gating
// (only rendering a form on an authenticated page) is not a security boundary.
import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export interface AppSession {
  userId: string
  name: string
  email: string
  role: string
  phoneMobile: string | null
}

function toAppSession(s: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>): AppSession {
  const u = s.user as typeof s.user & { role?: string; phoneMobile?: string | null; active?: boolean }
  return {
    userId: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? 'sales',
    phoneMobile: u.phoneMobile ?? null,
  }
}

/** For Server Actions and Route Handlers: throw if unauthenticated. */
export async function requireSession(): Promise<AppSession> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || (session.user as { active?: boolean }).active === false) {
    throw new Error('Unauthenticated')
  }
  return toAppSession(session)
}

/** For pages/layouts: redirect to sign-in instead of throwing. */
export async function requireSessionOrRedirect(): Promise<AppSession> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || (session.user as { active?: boolean }).active === false) {
    redirect('/sign-in')
  }
  return toAppSession(session)
}

/** Managers see all expenses; everyone else only their own (ADR-0017). */
export function isManager(session: AppSession): boolean {
  return session.role === 'manager'
}
