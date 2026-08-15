// Drizzle schema — derived from the ADRs and client source documents.
// NOTE: docs/02-data-model.md is referenced throughout the docs but is not in
// the repository; this schema is reconstructed from ADR-0025..0044 and
// user-story/*.md. Reconcile against 02-data-model.md when it lands.
//
// Conventions (docs/03-tech-stack.md):
// - Money is NUMERIC(15,2), read as a string, computed with decimal.js (G3).
//   `mode: 'number'` is banned on every money column.
// - Dates are stored Gregorian, formatted at render (ADR-0031).
// - No bilingual data fields except on `company` (ADR-0031).
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Auth (Better Auth manages these; shape follows its drizzle adapter)
// ---------------------------------------------------------------------------

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // App-specific fields (ADR-0006 flat permissions; manager flag gates expenses)
  role: text('role').notNull().default('sales'), // 'sales' | 'manager'
  phoneMobile: text('phone_mobile'), // printed as "Sales Person" on quotations
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'), // Argon2id hash (ADR-0042)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

// One table, seven kinds — the reason only one admin screen is needed
// (docs/03-tech-stack.md §7.2).
export const picklistKind = pgEnum('picklist_kind', [
  'incoterm',
  'unit',
  'country',
  'document_type',
  'task_type',
  'lead_source',
  'lost_reason',
])

export const picklists = pgTable(
  'picklist',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    kind: picklistKind('kind').notNull(),
    value: text('value').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('picklist_kind_value_uq').on(t.kind, t.value)],
)

// Singleton — the quotation header block (ADR-0031: the only place bilingual
// data fields survive; the company prints its own name/address in both).
export const company = pgTable('company', {
  id: integer('id').primaryKey().default(1),
  nameTh: text('name_th').notNull(),
  nameEn: text('name_en').notNull(),
  addressTh: text('address_th').notNull(),
  addressEn: text('address_en').notNull(),
  tel: text('tel').notNull(),
  taxId: text('tax_id'),
  logoPath: text('logo_path'),
  thankYouTextTh: text('thank_you_text_th'),
  thankYouTextEn: text('thank_you_text_en'),
})

// Reusable paragraphs — e.g. the Hazardous Substances import-permission text
// that recurs on restricted-chemical lead times (quotation-template-spec §3.4).
export const noteSnippets = pgTable('note_snippet', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// CRM core
// ---------------------------------------------------------------------------

// ADR-0034: principal folded into account types.
export const accountType = pgEnum('account_type', ['customer', 'principal', 'partner', 'other'])

export const accounts = pgTable('account', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  type: accountType('type').notNull().default('customer'),
  address: text('address'),
  // Thai tax requirement: tax ID with branch designation, e.g.
  // "0105566040011 (Head Office)" — a stored field, not typed each time.
  taxId: text('tax_id'),
  taxBranch: text('tax_branch'),
  defaultCurrency: text('default_currency').notNull().default('THB'),
  leadSource: text('lead_source'),
  createdById: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const people = pgTable(
  'person',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    name: text('name').notNull(),
    position: text('position'),
    email: text('email'),
    tel: text('tel'),
    mobile: text('mobile'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('person_account_idx').on(t.accountId)],
)

// ADR-0029: project types; consumables continue across reorders.
export const projectType = pgEnum('project_type', ['consumable', 'equipment', 'part', 'service'])
// ADR-0028: progress and status are independent. Progress freezes on loss.
export const projectStatus = pgEnum('project_status', ['open', 'won', 'lost'])

export const projects = pgTable(
  'project',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    name: text('name').notNull(),
    type: projectType('type').notNull(),
    // Fixed steps 10–100 (ADR-0025); labels are display-only.
    progress: smallint('progress').notNull().default(10),
    status: projectStatus('status').notNull().default('open'),
    lostReason: text('lost_reason'),
    // Forecast only. Actual revenue is the sum of Orders (ADR-0030).
    expectedAmount: numeric('expected_amount', { precision: 15, scale: 2 }),
    currency: text('currency').notNull().default('THB'),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('project_account_idx').on(t.accountId), index('project_owner_idx').on(t.ownerId)],
)

// Written on every progress and status change, including backwards
// (testing priority 8).
export const projectHistory = pgTable(
  'project_history',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    field: text('field').notNull(), // 'progress' | 'status'
    oldValue: text('old_value'),
    newValue: text('new_value').notNull(),
    changedById: text('changed_by_id')
      .notNull()
      .references(() => users.id),
    changedAt: timestamp('changed_at').notNull().defaultNow(),
  },
  (t) => [index('project_history_project_idx').on(t.projectId)],
)

// ---------------------------------------------------------------------------
// Quotations (ADR-0012, ADR-0031, ADR-0040)
// ---------------------------------------------------------------------------

export const quotationStatus = pgEnum('quotation_status', ['draft', 'issued', 'superseded'])

export const quotations = pgTable(
  'quotation',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    // Mandatory link (ADR-0023's surviving half): every quotation belongs to
    // a project.
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    // Global sequential QUO##### continuing VCS's existing counter (ADR-0031).
    number: text('number').notNull().unique(),
    revision: integer('revision').notNull().default(0), // suffix -R2 recommended (B4)
    status: quotationStatus('status').notNull().default('draft'),
    date: date('date').notNull(),
    // Text, not dates — samples contain "Cash", "See below",
    // "30 days after the date of invoice" (ADR-0031).
    validityText: text('validity_text'),
    deliveryDateText: text('delivery_date_text'),
    paymentTermText: text('payment_term_text'),
    leadTimeText: text('lead_time_text'), // full paragraph; NoteSnippet feeds it
    regulatoryNote: text('regulatory_note'),
    currency: text('currency').notNull().default('THB'),
    incoterm: text('incoterm'),
    countryOfOrigin: text('country_of_origin'),
    vatApplied: boolean('vat_applied').notNull().default(true),
    // ADR-0040: one FX rate per quotation, frozen at issue.
    costCurrency: text('cost_currency'),
    fxRate: numeric('fx_rate', { precision: 15, scale: 6 }),
    // Client snapshot, copied at issue time — editing the account later never
    // changes what an issued quotation reprints as (ADR-0031).
    billToName: text('bill_to_name'),
    billToAddress: text('bill_to_address'),
    billToTaxId: text('bill_to_tax_id'),
    billToTaxBranch: text('bill_to_tax_branch'),
    attentionPersonId: integer('attention_person_id').references(() => people.id),
    attentionName: text('attention_name'),
    attentionEmail: text('attention_email'),
    attentionTel: text('attention_tel'),
    // Salesperson snapshot from the logged-in user's profile.
    salespersonName: text('salesperson_name'),
    salespersonPhone: text('salesperson_phone'),
    // Totals — derived by lib/quotations/totals.ts (decimal.js), stored for
    // reporting. Server value is authoritative (docs/03-tech-stack.md §6).
    totalAmount: numeric('total_amount', { precision: 15, scale: 2 }),
    vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }),
    grandTotal: numeric('grand_total', { precision: 15, scale: 2 }),
    issuedAt: timestamp('issued_at'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('quotation_project_idx').on(t.projectId)],
)

export const discountType = pgEnum('discount_type', ['amount', 'percent'])

export const quotationLines = pgTable(
  'quotation_line',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    quotationId: integer('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    itemCode: text('item_code'),
    itemName: text('item_name').notNull(),
    description: text('description'),
    quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
    unit: text('unit').notNull().default('ea'), // printed inside the qty column
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
    // Discount format (amount vs percent) is open question B3 — both modelled.
    discountType: discountType('discount_type'),
    discountValue: numeric('discount_value', { precision: 15, scale: 4 }),
    // INTERNAL ONLY — never printed. Excluded from the PDF whitelist
    // (lib/pdf/context.ts) and guarded by the sentinel test.
    unitCost: numeric('unit_cost', { precision: 15, scale: 2 }),
    // Derived: quantity × unitPrice − discount. Computed with decimal.js.
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
    imagePath: text('image_path'),
  },
  (t) => [uniqueIndex('quotation_line_seq_uq').on(t.quotationId, t.sequence)],
)

// Kit contents printed inside the description cell — qty + code + name, no
// individual prices (quotation-template-spec §2.6b).
export const quotationLineComponents = pgTable(
  'quotation_line_component',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    lineId: integer('line_id')
      .notNull()
      .references(() => quotationLines.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull().default('1'),
    code: text('code'),
    name: text('name').notNull(),
  },
  (t) => [index('qlc_line_idx').on(t.lineId)],
)

// cc contacts on the attention box (quotation-template-spec §2.3).
export const quotationCc = pgTable(
  'quotation_cc',
  {
    quotationId: integer('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => people.id),
  },
  (t) => [primaryKey({ columns: [t.quotationId, t.personId] })],
)

// Single-row counter. Seed from VCS's real current value before launch (B5) —
// the sequence is in the high 69000s and must not restart.
export const quotationCounter = pgTable('quotation_counter', {
  id: integer('id').primaryKey().default(1),
  lastNumber: integer('last_number').notNull(),
})

// ---------------------------------------------------------------------------
// Orders (ADR-0030: one Order per PO; actuals live here, forecast on Project)
// ---------------------------------------------------------------------------

export const orderStatus = pgEnum('order_status', ['ordered', 'delivered', 'invoiced'])

export const orders = pgTable(
  'order',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    poNumber: text('po_number').notNull(),
    poDate: date('po_date').notNull(),
    sourceQuotationId: integer('source_quotation_id').references(() => quotations.id),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('THB'),
    status: orderStatus('status').notNull().default('ordered'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('order_project_idx').on(t.projectId)],
)

// ---------------------------------------------------------------------------
// Activity: meetings, tasks (ADR-0005 timeline; phase1-architecture A4/A5)
// ---------------------------------------------------------------------------

export const meetings = pgTable(
  'meeting',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    date: date('date').notNull(),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('meeting_account_idx').on(t.accountId)],
)

// A meeting may cover several projects, or none (A4). Hours are reported at
// account level, never per project.
export const meetingProjects = pgTable(
  'meeting_project',
  {
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.projectId] })],
)

// A task may attach to a project, an account, a person, or nothing (A5).
// The My Tasks view is the daily landing page.
export const tasks = pgTable(
  'task',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    type: text('type'),
    projectId: integer('project_id').references(() => projects.id),
    accountId: integer('account_id').references(() => accounts.id),
    personId: integer('person_id').references(() => people.id),
    assignedToId: text('assigned_to_id')
      .notNull()
      .references(() => users.id),
    dueDate: date('due_date'),
    done: boolean('done').notNull().default(false),
    doneAt: timestamp('done_at'),
    // true when created by the reorder follow-up cron (ADR-0029). The
    // "one open auto-task at a time" rule keys off this flag.
    auto: boolean('auto').notNull().default(false),
    notes: text('notes'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('task_assigned_idx').on(t.assignedToId, t.done),
    index('task_project_idx').on(t.projectId),
  ],
)

// ---------------------------------------------------------------------------
// Documents (ADR-0010, ADR-0013: collected, not authored)
// ---------------------------------------------------------------------------

export const documents = pgTable(
  'document',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer('project_id').references(() => projects.id),
    accountId: integer('account_id').references(() => accounts.id),
    type: text('type').notNull(), // picklist kind 'document_type'
    title: text('title').notNull(),
    filePath: text('file_path').notNull(), // under MEDIA_ROOT; served via /api/media
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedById: text('uploaded_by_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('document_project_idx').on(t.projectId)],
)

// ---------------------------------------------------------------------------
// Expenses (ADR-0039 minimal capture; ADR-0017 visibility restriction)
// Access ONLY through lib/data/expenses.ts — the Data Access Layer (G1).
// ---------------------------------------------------------------------------

export const expenses = pgTable(
  'expense',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer('project_id').references(() => projects.id),
    incurredByUserId: text('incurred_by_user_id')
      .notNull()
      .references(() => users.id),
    date: date('date').notNull(),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('THB'),
    category: text('category'),
    note: text('note'),
    receiptPath: text('receipt_path'), // served only via the scoped media route
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('expense_user_idx').on(t.incurredByUserId)],
)
