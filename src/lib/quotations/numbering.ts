// The ONLY allocator of quotation numbers (docs/03-tech-stack.md §7).
//
// Format QUO#####, one continuous global counter with no annual reset
// (ADR-0031). The counter row must be seeded from VCS's real current value
// before launch — the sequence is in the high 69000s and restarting from 1
// would collide with documents already sent (open question B5; see
// scripts/seed.ts).
import 'server-only'
import { sql } from 'drizzle-orm'
import type { Db } from '@/lib/db'
import { quotationCounter } from '@/db/schema'

export function formatQuotationNumber(n: number): string {
  return `QUO${String(n).padStart(5, '0')}`
}

/**
 * Allocate the next number, concurrency-safe (testing priority 5): a single
 * atomic UPDATE ... RETURNING takes a row lock, so two simultaneous exports
 * can never receive the same number. Call inside the transaction that
 * creates the quotation, so an aborted create does not burn a number
 * silently — or accept gaps; gaps are safe, duplicates are not.
 */
export async function allocateQuotationNumber(tx: Db): Promise<string> {
  const rows = await tx
    .update(quotationCounter)
    .set({ lastNumber: sql`${quotationCounter.lastNumber} + 1` })
    .returning({ lastNumber: quotationCounter.lastNumber })
  const row = rows[0]
  if (!row) {
    throw new Error(
      'quotation_counter is not seeded. Run scripts/seed.ts, and before launch seed the REAL current VCS counter value (B5).',
    )
  }
  return formatQuotationNumber(row.lastNumber)
}
