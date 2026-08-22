// Drizzle schema — implements docs/02-data-model.md (canonical), as amended
// by ADR-0046 (lost reason free text, company T&C page, dual-entry discount)
// and ADR-0047 (counter on company, forward-only re-seed).
//
// Conventions (02 §1):
// - Constraints live in Postgres: CHECKs, partial unique indexes.
// - VARCHAR + TypeScript union, NOT Postgres enums (enum ALTER needs a lock).
// - Money NUMERIC(15,2) as string + decimal.js; `mode: 'number'` is banned
//   on money (G3). Rates NUMERIC(14,6). Currency CHAR(3).
// - TIMESTAMPTZ UTC; DATE Gregorian, Christian era on output.
// - Audit: created_by_id / updated_by_id ON DELETE SET NULL on tables users
//   edit; created_at / updated_at everywhere.
// - Physical name `purchase_order` (ORDER is a reserved word, 02 §7).
import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  bigint,
  bigserial,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Unions (02 §1: varchar + TS union, not pg enums)
// ---------------------------------------------------------------------------

export type AccountType = 'client' | 'supplier' | 'manufacturer' | 'service_provider' | 'logistics'
export type AccountStatus = 'active' | 'inactive' | 'prospect'
export type DecisionRole = 'technical' | 'commercial' | 'decision_maker'
export type UserRole = 'ceo' | 'finance' | 'sales_engineer' | 'sales_manager'
export type PicklistKind =
  | 'incoterm'
  | 'unit'
  | 'country'
  | 'document_type'
  | 'task_type'
  | 'lead_source' // NOTE: no 'lost_reason' — ADR-0046 B9: free text, no codes
export type SnippetCategory = 'lead_time' | 'regulatory' | 'terms' | 'other'
export type ProjectType = 'consumable' | 'equipment' | 'part' | 'service'
export type ProjectStatus = 'open' | 'won' | 'lost'
export type QuotationStatus = 'draft' | 'issued' | 'superseded' | 'accepted' | 'expired'
export type DiscountType = 'amount' | 'percent'
export type OrderStatus = 'ordered' | 'delivered' | 'invoiced'
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'
export type MeetingStatus = 'planned' | 'completed' | 'cancelled' | 'no_show'
export type MeetingMode = 'client_site' | 'office' | 'online' | 'phone'
export type DocumentStatus = 'draft' | 'sent' | 'accepted' | 'superseded'
export type ExpenseCategory = 'travel' | 'fuel' | 'accommodation' | 'entertainment' | 'other'

export const PROGRESS_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const

// ---------------------------------------------------------------------------
// Auth (Better Auth owns these; text PKs are its convention — 02 §3.4 notes
// the user table is managed by Better Auth alongside its own tables)
// ---------------------------------------------------------------------------

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // Prints in the quotation Sales Person column — required (form-enforced)
  // for anyone issuing quotations.
  phoneMobile: varchar('phone_mobile', { length: 50 }),
  // Stored, not enforced in Phase 1 (ADR-0006) — except expenses (02 §9a).
  role: varchar('role', { length: 20 }).$type<UserRole>().notNull().default('sales_engineer'),
  active: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const authAccounts = pgTable('auth_account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'), // Argon2id (ADR-0042)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Reference and settings (02 §3)
// ---------------------------------------------------------------------------

// Singleton — everything that prints on a document, plus the quotation
// counter (ADR-0047: seeded once from VCS's real value, forward-only
// re-seed via admin; allocation happens at ISSUE, 02 §6.5).
export const company = pgTable(
  'company',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    nameTh: varchar('name_th', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }).notNull(),
    addressTh: text('address_th').notNull(),
    addressEn: text('address_en').notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    taxId: varchar('tax_id', { length: 20 }),
    logo: varchar('logo', { length: 255 }),
    quotationFooterTextTh: text('quotation_footer_text_th'),
    quotationFooterTextEn: text('quotation_footer_text_en'),
    // ADR-0046 B2/T1: standard terms & conditions, printed as the PDF's
    // final page when set. Wording still awaited from VCS (T1).
    quotationTermsText: text('quotation_terms_text'),
    defaultVatRate: numeric('default_vat_rate', { precision: 5, scale: 2 }).notNull().default('7.00'),
    quotationNumberPrefix: varchar('quotation_number_prefix', { length: 10 }).notNull().default('QUO'),
    // Seed from VCS's current counter (B5 — placeholder until it arrives).
    quotationNumberNext: integer('quotation_number_next').notNull(),
    dateFormat: varchar('date_format', { length: 20 }).notNull().default('DD/MM/YYYY'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('company_single_row', sql`${t.id} = 1`)],
)

export const picklists = pgTable(
  'picklist',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    kind: varchar('kind', { length: 30 }).$type<PicklistKind>().notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    sortOrder: smallint('sort_order').notNull().default(0),
    // Retire without deleting — old records must still render.
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [
    uniqueIndex('picklist_kind_code_uq').on(t.kind, t.code),
    index('picklist_kind_active_idx').on(t.kind, t.isActive, t.sortOrder),
  ],
)

export const noteSnippets = pgTable('note_snippet', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 20 }).$type<SnippetCategory>().notNull().default('other'),
  body: text('body').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Accounts and people (02 §4)
// ---------------------------------------------------------------------------

export const accounts = pgTable(
  'account',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    // Multi-select (ADR-0034): an account plays as many roles as it plays.
    // text[] + GIN beats a join table at this scale (02 §4.1).
    types: text('types').array().$type<AccountType[]>().notNull().default(sql`ARRAY['client']::text[]`),
    taxId: varchar('tax_id', { length: 20 }),
    taxBranch: varchar('tax_branch', { length: 100 }), // Thai tax requirement, e.g. "Head Office"
    // Company switchboard — the number an engineer dials for operations
    // (review round 1; not in 02, added on KK's request).
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    industry: varchar('industry', { length: 100 }),
    countryId: bigint('country_id', { mode: 'number' }).references(() => picklists.id),
    defaultCurrency: char('default_currency', { length: 3 }).notNull().default('THB'),
    defaultPaymentTerm: varchar('default_payment_term', { length: 255 }),
    ownerUserId: text('owner_user_id').references(() => users.id),
    status: varchar('status', { length: 20 }).$type<AccountStatus>().notNull().default('active'),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('account_types_gin').using('gin', t.types),
    index('account_status_owner_idx').on(t.status, t.ownerUserId),
  ],
)

export const people = pgTable(
  'person',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    accountId: bigint('account_id', { mode: 'number' })
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    position: varchar('position', { length: 255 }),
    department: varchar('department', { length: 255 }),
    email: varchar('email', { length: 254 }), // prints in the Attention box
    phone: varchar('phone', { length: 50 }),
    mobile: varchar('mobile', { length: 50 }),
    lineId: varchar('line_id', { length: 100 }), // normal in Thai B2B
    isPrimary: boolean('is_primary').notNull().default(false),
    decisionRole: varchar('decision_role', { length: 20 }).$type<DecisionRole>(),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('person_account_primary_idx').on(t.accountId, t.isPrimary),
    // One primary contact per account (02 §4.2).
    uniqueIndex('person_one_primary_per_account').on(t.accountId).where(sql`${t.isPrimary}`),
  ],
)

// ---------------------------------------------------------------------------
// Project (02 §5)
// ---------------------------------------------------------------------------

export const projects = pgTable(
  'project',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectNo: varchar('project_no', { length: 30 }), // open question N7
    name: varchar('name', { length: 255 }).notNull(),
    accountId: bigint('account_id', { mode: 'number' })
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    primaryPersonId: bigint('primary_person_id', { mode: 'number' }).references(() => people.id, {
      onDelete: 'set null',
    }),
    type: varchar('type', { length: 20 }).$type<ProjectType>().notNull(),
    progress: smallint('progress').notNull().default(10),
    status: varchar('status', { length: 10 }).$type<ProjectStatus>().notNull().default('open'),
    // ADR-0046 B9: free text, no picklist codes. Required when lost (CHECK).
    lostReason: varchar('lost_reason', { length: 255 }),
    lostNote: text('lost_note'),
    competitor: varchar('competitor', { length: 255 }), // captured at Lost
    expectedAmount: numeric('expected_amount', { precision: 15, scale: 2 }), // forecast only
    // The real amount entered when the project is set Won (review round 1 —
    // KK chose a simple field over auto-creating an Order). Orders still
    // track individual POs and drive the reorder clock.
    wonAmount: numeric('won_amount', { precision: 15, scale: 2 }),
    // Derived — latest issued quotation grand total. Maintained by the
    // quotation issue/revise transaction (02 §5.1), recomputable.
    quotedValue: numeric('quoted_value', { precision: 15, scale: 2 }),
    currency: char('currency', { length: 3 }).notNull().default('THB'),
    expectedCloseDate: date('expected_close_date'),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    leadSourceId: bigint('lead_source_id', { mode: 'number' }).references(() => picklists.id),
    // Consumable reorder loop (ADR-0029): set by the engineer, prompted at
    // Won. Drives recurrence; counts from the most recent order date.
    followupIntervalDays: smallint('followup_interval_days'),
    followupPaused: boolean('followup_paused').notNull().default(false),
    // Part → Equipment, optional (02 §5.1).
    parentProjectId: bigint('parent_project_id', { mode: 'number' }).references(
      (): AnyPgColumn => projects.id,
    ),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('project_progress_steps', sql`${t.progress} IN (10,20,30,40,50,60,70,80,90,100)`),
    check('project_lost_needs_reason', sql`${t.status} <> 'lost' OR ${t.lostReason} IS NOT NULL`),
    check('project_parent_part_only', sql`${t.parentProjectId} IS NULL OR ${t.type} = 'part'`),
    check('project_no_self_parent', sql`${t.parentProjectId} IS NULL OR ${t.parentProjectId} <> ${t.id}`),
    check(
      'project_interval_consumable_only',
      sql`${t.followupIntervalDays} IS NULL OR ${t.type} = 'consumable'`,
    ),
    index('project_pipeline_idx').on(t.status, t.progress),
    index('project_owner_idx').on(t.ownerUserId, t.status),
    index('project_account_idx').on(t.accountId),
    index('project_reorder_cohort_idx').on(t.type, t.status).where(sql`${t.type} = 'consumable'`),
    index('project_parent_idx').on(t.parentProjectId).where(sql`${t.parentProjectId} IS NOT NULL`),
    index('project_close_date_idx').on(t.expectedCloseDate).where(sql`${t.status} = 'open'`),
  ],
)

export const projectHistory = pgTable(
  'project_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    field: varchar('field', { length: 20 }).$type<'progress' | 'status'>().notNull(),
    fromValue: varchar('from_value', { length: 20 }),
    toValue: varchar('to_value', { length: 20 }).notNull(),
    changedById: text('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('project_history_project_idx').on(t.projectId, t.changedAt),
    index('project_history_lost_at_stage_idx').on(t.field, t.toValue, t.changedAt),
  ],
)

// ---------------------------------------------------------------------------
// Quotation (02 §6)
// ---------------------------------------------------------------------------

export const quotations = pgTable(
  'quotation',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    // Assigned at ISSUE (02 §6.5) — null while draft; drafts consume nothing.
    quotationNo: varchar('quotation_no', { length: 30 }),
    revision: smallint('revision').notNull().default(1),
    status: varchar('status', { length: 20 }).$type<QuotationStatus>().notNull().default('draft'),
    quotationDate: date('quotation_date').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    // Client snapshot — copied at issue, never joined live (02 §6.1).
    billToName: varchar('bill_to_name', { length: 255 }),
    billToAddress: text('bill_to_address'),
    billToTaxId: varchar('bill_to_tax_id', { length: 20 }),
    billToBranch: varchar('bill_to_branch', { length: 100 }),
    attentionPersonId: bigint('attention_person_id', { mode: 'number' }).references(() => people.id, {
      onDelete: 'set null',
    }),
    // Terms — header level (ADR-0046 B6 confirmed).
    currency: char('currency', { length: 3 }).notNull().default('THB'),
    // All line costs share this currency; one rate per document (ADR-0040).
    costCurrency: char('cost_currency', { length: 3 }),
    fxRateCostToSelling: numeric('fx_rate_cost_to_selling', { precision: 14, scale: 6 }),
    validityText: varchar('validity_text', { length: 255 }),
    deliveryDateText: varchar('delivery_date_text', { length: 255 }),
    paymentTermText: varchar('payment_term_text', { length: 255 }),
    incotermId: bigint('incoterm_id', { mode: 'number' }).references(() => picklists.id),
    countryOfOriginId: bigint('country_of_origin_id', { mode: 'number' }).references(
      () => picklists.id,
    ),
    leadTimeText: text('lead_time_text'), // a paragraph, not a number
    remarks: text('remarks'),
    // Tax
    vatApplied: boolean('vat_applied').notNull().default(true),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('7.00'),
    whtNote: text('wht_note'), // service projects
    // Totals — calculated on save, frozen at issue (02 §6.1).
    subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0.00'),
    discountTotal: numeric('discount_total', { precision: 15, scale: 2 }).notNull().default('0.00'),
    vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
    grandTotal: numeric('grand_total', { precision: 15, scale: 2 }).notNull().default('0.00'),
    // Internal — never printed (02 §10).
    totalCost: numeric('total_cost', { precision: 15, scale: 2 }),
    totalMargin: numeric('total_margin', { precision: 15, scale: 2 }),
    salespersonUserId: text('salesperson_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('quotation_no_revision_uq')
      .on(t.quotationNo, t.revision)
      .where(sql`${t.quotationNo} IS NOT NULL`),
    check('quotation_issued_has_no', sql`${t.status} = 'draft' OR ${t.quotationNo} IS NOT NULL`),
    check('quotation_issued_has_ts', sql`${t.status} = 'draft' OR ${t.issuedAt} IS NOT NULL`),
    check('quotation_totals_nonneg', sql`${t.subtotal} >= 0 AND ${t.grandTotal} >= 0`),
    index('quotation_project_status_idx').on(t.projectId, t.status),
    index('quotation_awaiting_idx').on(t.status, t.issuedAt),
    index('quotation_no_idx').on(t.quotationNo),
  ],
)

export const quotationLines = pgTable(
  'quotation_line',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    quotationId: bigint('quotation_id', { mode: 'number' })
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    sequence: smallint('sequence').notNull(),
    itemCode: varchar('item_code', { length: 100 }), // free text (ADR-0032)
    itemName: varchar('item_name', { length: 500 }).notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitId: bigint('unit_id', { mode: 'number' }).references(() => picklists.id),
    moqNote: varchar('moq_note', { length: 255 }),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(), // net of VAT
    // ADR-0046 B3: user enters either; the app derives and displays the
    // other. discount_type records which was entered (authoritative on
    // re-derive after a price change).
    discountType: varchar('discount_type', { length: 10 }).$type<DiscountType>(),
    discountValue: numeric('discount_value', { precision: 15, scale: 2 }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
    // Internal — never printed (02 §10). unit_cost is in
    // quotation.cost_currency; line_cost/line_margin in selling currency.
    unitCost: numeric('unit_cost', { precision: 15, scale: 2 }),
    lineCost: numeric('line_cost', { precision: 15, scale: 2 }),
    lineMargin: numeric('line_margin', { precision: 15, scale: 2 }),
    image: varchar('image', { length: 255 }),
    lineNotes: text('line_notes'),
  },
  (t) => [
    uniqueIndex('quotation_line_seq_uq').on(t.quotationId, t.sequence),
    // Autocomplete: ranked recency-then-frequency over prior lines.
    index('quotation_line_item_code_idx').on(t.itemCode),
  ],
)

// Un-priced kit breakdown (QUO69041's eleven components). No price column —
// it would invite someone to sum them and disagree with the line.
export const quotationComponents = pgTable(
  'quotation_component',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    quotationLineId: bigint('quotation_line_id', { mode: 'number' })
      .notNull()
      .references(() => quotationLines.id, { onDelete: 'cascade' }),
    sequence: smallint('sequence').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull().default('1'),
    itemCode: varchar('item_code', { length: 100 }),
    itemName: varchar('item_name', { length: 500 }).notNull(),
  },
  (t) => [uniqueIndex('quotation_component_seq_uq').on(t.quotationLineId, t.sequence)],
)

export const quotationCc = pgTable(
  'quotation_cc',
  {
    quotationId: bigint('quotation_id', { mode: 'number' })
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    personId: bigint('person_id', { mode: 'number' })
      .notNull()
      .references(() => people.id, { onDelete: 'restrict' }),
  },
  (t) => [uniqueIndex('quotation_cc_uq').on(t.quotationId, t.personId)],
)

// ---------------------------------------------------------------------------
// Purchase order (02 §7 — one record per PO; `order` is reserved in SQL)
// ---------------------------------------------------------------------------

export const purchaseOrders = pgTable(
  'purchase_order',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    poNumber: varchar('po_number', { length: 100 }).notNull(),
    poDate: date('po_date').notNull(), // drives the follow-up clock
    // Optional — repeat orders often arrive against a standing price.
    sourceQuotationId: bigint('source_quotation_id', { mode: 'number' }).references(
      () => quotations.id,
    ),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('THB'),
    // 'invoiced' is a user assertion, not evidence — the CRM issues no
    // invoices (ADR-0018). Reports must not present it as financial fact.
    status: varchar('status', { length: 20 }).$type<OrderStatus>().notNull().default('ordered'),
    isVoid: boolean('is_void').notNull().default(false), // void, do not delete
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The query the recurrence scheduler runs (02 §7).
    index('purchase_order_project_date_idx').on(t.projectId, t.poDate).where(sql`NOT ${t.isVoid}`),
  ],
)

// ---------------------------------------------------------------------------
// Activity (02 §8) — task and meeting are separate tables, per the client
// ---------------------------------------------------------------------------

export const tasks = pgTable(
  'task',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    typeId: bigint('type_id', { mode: 'number' }).references(() => picklists.id),
    status: varchar('status', { length: 20 }).$type<TaskStatus>().notNull().default('open'),
    dueDate: date('due_date'),
    completedDate: date('completed_date'),
    assigneeUserId: text('assignee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    // A task may attach to a project, an account, a person, or nothing —
    // which is why My Tasks is the landing page (02 §8.1).
    projectId: bigint('project_id', { mode: 'number' }).references(() => projects.id),
    accountId: bigint('account_id', { mode: 'number' }).references(() => accounts.id),
    personId: bigint('person_id', { mode: 'number' }).references(() => people.id),
    isAutoGenerated: boolean('is_auto_generated').notNull().default(false),
    recurrenceParentTaskId: bigint('recurrence_parent_task_id', { mode: 'number' }).references(
      (): AnyPgColumn => tasks.id,
    ),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('task_done_has_date', sql`${t.status} <> 'done' OR ${t.completedDate} IS NOT NULL`),
    check(
      'task_no_self_recurrence',
      sql`${t.recurrenceParentTaskId} IS NULL OR ${t.recurrenceParentTaskId} <> ${t.id}`,
    ),
    index('task_my_tasks_idx').on(t.assigneeUserId, t.status, t.dueDate),
    index('task_project_idx').on(t.projectId).where(sql`${t.projectId} IS NOT NULL`),
    index('task_recurrence_idx')
      .on(t.recurrenceParentTaskId)
      .where(sql`${t.recurrenceParentTaskId} IS NOT NULL`),
    index('task_auto_idx').on(t.isAutoGenerated, t.status).where(sql`${t.isAutoGenerated}`),
  ],
)

export const meetings = pgTable(
  'meeting',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    agenda: text('agenda'),
    outcomeNotes: text('outcome_notes'),
    status: varchar('status', { length: 20 }).$type<MeetingStatus>().notNull().default('completed'),
    meetingDate: date('meeting_date').notNull(),
    startTime: time('start_time'),
    durationHours: numeric('duration_hours', { precision: 4, scale: 2 }),
    mode: varchar('mode', { length: 20 }).$type<MeetingMode>().notNull().default('client_site'),
    location: varchar('location', { length: 255 }),
    // No project_id — a meeting may cover several projects or none (02 §8.2).
    accountId: bigint('account_id', { mode: 'number' }).references(() => accounts.id),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('meeting_date_idx').on(t.meetingDate),
    index('meeting_account_date_idx').on(t.accountId, t.meetingDate),
  ],
)

// Hours are reported per account and per user, never per project — the join
// stores the association; reporting deliberately does not divide duration.
export const meetingProjects = pgTable(
  'meeting_project',
  {
    meetingId: bigint('meeting_id', { mode: 'number' })
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('meeting_project_uq').on(t.meetingId, t.projectId)],
)

// Internal users and external contacts in one list — exactly one of the two.
export const meetingAttendees = pgTable(
  'meeting_attendee',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    meetingId: bigint('meeting_id', { mode: 'number' })
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    personId: bigint('person_id', { mode: 'number' }).references(() => people.id), // external
    userId: text('user_id').references(() => users.id), // internal
  },
  (t) => [
    check(
      'meeting_attendee_exactly_one',
      sql`(${t.personId} IS NOT NULL) <> (${t.userId} IS NOT NULL)`,
    ),
    uniqueIndex('meeting_attendee_person_uq')
      .on(t.meetingId, t.personId)
      .where(sql`${t.personId} IS NOT NULL`),
    uniqueIndex('meeting_attendee_user_uq')
      .on(t.meetingId, t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
  ],
)

// ---------------------------------------------------------------------------
// Document (02 §9) — collected, not authored; quotations file themselves
// ---------------------------------------------------------------------------

export const documents = pgTable(
  'document',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectId: bigint('project_id', { mode: 'number' })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    docTypeId: bigint('doc_type_id', { mode: 'number' })
      .notNull()
      .references(() => picklists.id),
    file: varchar('file', { length: 255 }).notNull(), // under MEDIA_ROOT, served via /api/media
    originalFilename: varchar('original_filename', { length: 255 }),
    version: smallint('version').notNull().default(1),
    issueDate: date('issue_date'), // the date ON the document, not the upload date
    status: varchar('status', { length: 20 }).$type<DocumentStatus>().notNull().default('sent'),
    isGenerated: boolean('is_generated').notNull().default(false),
    sourceQuotationId: bigint('source_quotation_id', { mode: 'number' }).references(
      () => quotations.id,
    ),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: text('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('document_generated_has_source', sql`NOT ${t.isGenerated} OR ${t.sourceQuotationId} IS NOT NULL`),
    index('document_project_type_idx').on(t.projectId, t.docTypeId, t.issueDate),
    index('document_source_quotation_idx')
      .on(t.sourceQuotationId)
      .where(sql`${t.sourceQuotationId} IS NOT NULL`),
  ],
)

// ---------------------------------------------------------------------------
// Expense (02 §9a) — the ONLY table with an enforced permission rule in
// Phase 1. Access ONLY through lib/data/expenses.ts, which exports no
// unscoped query. Visible to incurred_by and sales_manager/ceo roles.
// ---------------------------------------------------------------------------

export const expenses = pgTable(
  'expense',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    expenseDate: date('expense_date').notNull(),
    // No per-diem — VCS pays none, so every expense is receipt-backed.
    category: varchar('category', { length: 20 }).$type<ExpenseCategory>().notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('THB'),
    receiptImage: varchar('receipt_image', { length: 255 }),
    note: varchar('note', { length: 255 }),
    incurredByUserId: text('incurred_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    projectId: bigint('project_id', { mode: 'number' }).references(() => projects.id),
    meetingId: bigint('meeting_id', { mode: 'number' }).references(() => meetings.id), // the visit that incurred it
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('expense_amount_positive', sql`${t.amount} > 0`),
    index('expense_user_date_idx').on(t.incurredByUserId, t.expenseDate),
    index('expense_project_idx').on(t.projectId).where(sql`${t.projectId} IS NOT NULL`),
  ],
)
