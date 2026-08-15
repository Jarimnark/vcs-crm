// Development seed. Run after migrations: npm run db:seed
//
// ⚠️ LAUNCH NOTE (B5): the quotation counter below is a PLACEHOLDER. Before
// go-live it must be seeded with VCS's real current counter value (high
// 69000s) and verified by hand — restarting the sequence would collide with
// documents already sent (ADR-0031).
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const SEED_PICKLISTS: Record<string, string[]> = {
  incoterm: ['DDP', 'EXW', 'FOB', 'CIF'],
  unit: ['ea', 'SET', 'kg', 'g', 'L', 'pc'],
  country: ['Germany', 'Thailand', 'Japan', 'China', 'USA'],
  document_type: ['Purchase Order', 'Specification', 'Drawing', 'Certificate', 'Report'],
  task_type: ['Call', 'Visit', 'Quotation follow-up', 'Reorder follow-up', 'Other'],
  lead_source: ['Existing customer', 'Referral', 'Principal lead', 'Exhibition', 'Website'],
  // Final list is open question B9 — editable by the client later.
  lost_reason: ['Price', 'Lead time', 'Lost to competitor', 'Project cancelled', 'No budget'],
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgres://vcs:vcs@localhost:5432/vcs_crm',
    max: 1,
  })
  const db = drizzle(pool, { schema })

  // Quotation counter — placeholder, see the launch note above.
  await db
    .insert(schema.quotationCounter)
    .values({ id: 1, lastNumber: 69000 })
    .onConflictDoNothing()

  // Company singleton — placeholder values; edit in Admin → Company.
  await db
    .insert(schema.company)
    .values({
      id: 1,
      nameTh: 'บริษัท วีซีเอส จำกัด',
      nameEn: 'VCS Co., Ltd.',
      addressTh: 'กรุงเทพมหานคร ประเทศไทย',
      addressEn: 'Bangkok, Thailand',
      tel: '02-000-0000',
      thankYouTextTh: 'ขอขอบพระคุณที่ให้ความสนใจในสินค้าและบริการของเรา',
      thankYouTextEn: 'Thank you for your interest in our products and services.',
    })
    .onConflictDoNothing()

  for (const [kind, values] of Object.entries(SEED_PICKLISTS)) {
    for (const [i, value] of values.entries()) {
      await db
        .insert(schema.picklists)
        .values({ kind: kind as (typeof schema.picklistKind.enumValues)[number], value, sortOrder: i })
        .onConflictDoNothing()
    }
  }

  const counters = await db.execute(sql`select last_number from quotation_counter`)
  console.log('Seeded. Quotation counter at:', (counters.rows[0] as { last_number: number }).last_number)
  console.log('Create the first user with: ALLOW_SIGNUP=true npm run dev  → then POST /api/auth/sign-up/email')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
