// Reorder follow-up generation (ADR-0029) — called daily by system cron:
//
//   15 1 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//                http://127.0.0.1:3000/api/cron/followups
//
// Bearer token required: an unauthenticated job endpoint is a public write.
// The handler is idempotent — cron can miss a run or fire twice safely
// (docs/03-tech-stack.md §11).
import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { generateFollowupTasks } from '@/lib/data/tasks'

export const dynamic = 'force-dynamic'

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const created = await generateFollowupTasks()
  return NextResponse.json({ created })
}

// Allow GET for curl convenience — same auth, same idempotent behaviour.
export const GET = POST
