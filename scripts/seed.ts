// Development seed (02 §13: company → picklists → users → note snippets).
//
// ⚠️ LAUNCH NOTE (B5, ADR-0047): quotation_number_next below is a
// PLACEHOLDER continuing from the known samples (QUO69054). Before go-live
// it must be set to VCS's REAL current counter and verified by hand —
// their sequence is live and restarting or colliding is not recoverable.
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const SEED_PICKLISTS: Record<string, { code: string; label: string }[]> = {
  incoterm: ['DDP', 'EXW', 'FOB', 'CIF', 'CIP'].map((c) => ({ code: c, label: c })),
  unit: ['ea', 'SET', 'kg', 'g', 'L', 'pc'].map((c) => ({ code: c, label: c })),
  country: ['Germany', 'Thailand', 'Japan', 'China', 'USA'].map((c) => ({ code: c, label: c })),
  document_type: [
    'Quotation',
    'Proposal',
    'TDS',
    'MOQ',
    'PO',
    'Service Report',
    'Delivery Note',
    'Invoice',
    'Other',
  ].map((c) => ({ code: c, label: c })), // final list pending N6
  task_type: [
    { code: 'call', label: 'Call' },
    { code: 'email', label: 'Email' },
    { code: 'supplier_request', label: 'Supplier request' },
    { code: 'internal_followup', label: 'Internal follow-up' },
    { code: 'document_preparation', label: 'Document preparation' },
    { code: 'site_visit', label: 'Site visit' },
    { code: 'reorder_followup', label: 'Reorder follow-up' },
  ],
  lead_source: [
    { code: 'existing_customer', label: 'Existing customer' },
    { code: 'referral', label: 'Referral' },
    { code: 'principal_lead', label: 'Principal lead' },
    { code: 'exhibition', label: 'Exhibition' },
    { code: 'website', label: 'Website' },
  ],
  // NOTE: no lost_reason kind — free text per ADR-0046 B9.
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgres://vcs:vcs@localhost:5432/vcs_crm',
    max: 1,
  })
  const db = drizzle(pool, { schema })

  // Company singleton — placeholder values; edit in Admin → Company.
  await db
    .insert(schema.company)
    .values({
      id: 1,
      nameTh: 'บริษัท วีซีเอส จำกัด',
      nameEn: 'VCS Co., Ltd.',
      addressTh: 'กรุงเทพมหานคร ประเทศไทย',
      addressEn: 'Bangkok, Thailand',
      phone: '02-000-0000',
      quotationFooterTextTh: 'ขอขอบพระคุณที่ให้ความสนใจในสินค้าและบริการของเรา',
      quotationFooterTextEn: 'Thank you for your interest in our products and services.',
      quotationNumberNext: 69055, // ← B5 placeholder. Seed the REAL value before launch.
    })
    .onConflictDoNothing()

  for (const [kind, values] of Object.entries(SEED_PICKLISTS)) {
    for (const [i, v] of values.entries()) {
      await db
        .insert(schema.picklists)
        .values({
          kind: kind as schema.PicklistKind,
          code: v.code,
          label: v.label,
          sortOrder: i,
        })
        .onConflictDoNothing()
    }
  }

  // The motivating note snippet (02 §3.3).
  await db
    .insert(schema.noteSnippets)
    .values({
      title: 'Hazardous substances import permission',
      category: 'regulatory',
      body: 'This product contains restricted chemical which requires import permission from Hazardous Substances Control Bureau, Department of Industrial Works. It will take at least 8 weeks for permission certificate.',
    })
    .onConflictDoNothing()

  const counter = await db.execute(
    sql`select quotation_number_prefix, quotation_number_next from company where id = 1`,
  )
  const row = counter.rows[0] as { quotation_number_prefix: string; quotation_number_next: number }
  console.log(`Seeded. Next quotation number: ${row.quotation_number_prefix}${row.quotation_number_next} (PLACEHOLDER — B5)`)
  console.log('Create the first user with: ALLOW_SIGNUP=true npm run dev  → POST /api/auth/sign-up/email')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
