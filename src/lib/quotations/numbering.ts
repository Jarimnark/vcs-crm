// The ONLY allocator of quotation numbers (docs/02-data-model.md §6.5,
// ADR-0047).
//
// The counter lives on the company singleton and is allocated INSIDE the
// issue transaction — a deleted draft consumes nothing. A single-row
// UPDATE … RETURNING serialises concurrent issues, so duplicates are
// impossible; gaps are safe.
//
// ADR-0047: the counter is seeded once from VCS's real current value (B5)
// and may be re-seeded FORWARD ONLY by an admin (e.g. jump to 70000 next
// January). Never backwards — that would mint numbers customers already
// hold.
import 'server-only'
import { sql } from 'drizzle-orm'
import type { Db } from '@/lib/db'
import { company } from '@/db/schema'

export function formatQuotationNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(5, '0')}`
}

/** Call inside the transaction that issues the quotation (testing priority 5). */
export async function allocateQuotationNumber(tx: Db): Promise<string> {
  const rows = await tx
    .update(company)
    .set({ quotationNumberNext: sql`${company.quotationNumberNext} + 1` })
    .returning({
      allocated: sql<number>`${company.quotationNumberNext} - 1`,
      prefix: company.quotationNumberPrefix,
    })
  const row = rows[0]
  if (!row) {
    throw new Error(
      'company row is not seeded. Run scripts/seed.ts — and before launch seed the REAL current VCS counter value (B5).',
    )
  }
  return formatQuotationNumber(row.prefix, row.allocated)
}

/**
 * Forward-only re-seed (ADR-0047): the admin "next quotation number"
 * control. Refuses to move backwards.
 */
export async function setNextQuotationNumber(tx: Db, next: number): Promise<void> {
  if (!Number.isInteger(next) || next <= 0) throw new Error('Invalid number')
  const rows = await tx
    .update(company)
    .set({ quotationNumberNext: next })
    .where(sql`${company.quotationNumberNext} < ${next}`)
    .returning({ id: company.id })
  if (!rows.length) {
    throw new Error(
      'The next quotation number can only move forward — moving it backwards would duplicate numbers customers already hold.',
    )
  }
}
