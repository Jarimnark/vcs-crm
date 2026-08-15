# VCS CRM — Data Model / Table Design

| | |
|---|---|
| **Status** | Draft v1.1 — **rebaselined on Drizzle** ([ADR-0042](decisions/0042-nextjs-stack-choices.md)); for review before migration |
| **Last updated** | 2026-08-11 |
| **Target** | PostgreSQL 16, via **Drizzle** ([ADR-0042](decisions/0042-nextjs-stack-choices.md)) |
| **Reads from** | [Product concept](00-product-concept.md), [User flows](01-user-flows.md), [decision log](decisions/README.md) |

---

## 1. Conventions

Applied to every table, stated once.

| Convention | Rule |
|---|---|
| **Where truth lives** | Constraints are in **Postgres**, not application code. Drizzle is thinner than Django's ORM — a rule that exists only in TypeScript is a rule a migration or a script can bypass |
| **Primary key** | `id BIGSERIAL` |
| **Timestamps** | `created_at`, `updated_at` — `TIMESTAMPTZ NOT NULL`, stored **UTC**, displayed Asia/Bangkok |
| **Audit** | `created_by_id`, `updated_by_id` → `user`, `ON DELETE SET NULL`. On every table users can edit ([ADR-0006](decisions/0006-single-tenant-flat-permissions.md)) |
| **Dates** | `DATE` — Gregorian always. **Christian era** on output ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) |
| **Money** | `NUMERIC(15,2)`. **Never** float. ⚠️ Drizzle returns this as a **string** — keep it that way and use `decimal.js`. **`mode: 'number'` is banned** ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G3) |
| **Rates** | `NUMERIC(14,6)` |
| **Currency** | `CHAR(3)`, ISO 4217 |
| **Deletion** | Soft-delete only where history matters (`Order.is_void`). Otherwise **restrict** — Postgres `ON DELETE RESTRICT`; there is no ORM-level `PROTECT` to lean on |
| **Enums** | `VARCHAR` + a TypeScript union, **not** Postgres `ENUM` — altering a Postgres enum needs a migration lock |
| **Picklists** | Table-backed where the client will edit them; choices where they are structural |
| **Naming** | `snake_case`, singular table names |

**Enum vs picklist table.** Structural values that code branches on are `VARCHAR` + a union type: `project.type`, `project.status`, `quotation.status`, `task.status`, `meeting.mode`, `order.status`. Values the client will add to without a release are picklist tables: Incoterm, Unit, Country, DocumentType, TaskType, LeadSource, LostReason. The client's B1 entity map lists exactly these seven.

## 2. Entity map

```
company (singleton)          picklist (7 kinds)          note_snippet
user

account ──1:N── person
   │
   ├──1:N── project ──1:N── project_history
   │            │
   │            ├──1:N── quotation ──1:N── quotation_line ──1:N── quotation_component
   │            │             └──N:M── person  (cc)
   │            ├──1:N── order ──0:1── quotation
   │            ├──1:N── document ──0:1── quotation  (generated)
   │            ├──N:M── meeting        (via meeting_project)
   │            ├──1:N── task
   │            └──0:1── project        (parent equipment, Part only)
   │
   ├──1:N── task            (project-less)
   └──1:N── meeting

meeting ──1:N── meeting_attendee ──> person | user
task ──0:1── task            (recurrence chain)

expense ──> user  (incurred_by)   [restricted visibility]
        ──0:1── project
        ──0:1── meeting
```

**No `product` table** ([ADR-0032](decisions/0032-product-master-deferred-to-phase-2.md)). **No `principal` table** ([ADR-0034](decisions/0034-principal-folded-into-account-types.md)).

## 3. Reference and settings

### 3.1 `company` — singleton

Everything that prints on a document.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | BIGSERIAL | | Enforce single row: `CHECK (id = 1)` |
| `name_th`, `name_en` | VARCHAR(255) | | Both print on the quotation header |
| `address_th`, `address_en` | TEXT | | |
| `phone` | VARCHAR(50) | | |
| `tax_id` | VARCHAR(20) | | |
| `logo` | VARCHAR(255) | ✓ | Media path |
| `quotation_footer_text_th` | TEXT | | Thank-you text |
| `quotation_footer_text_en` | TEXT | | |
| `default_vat_rate` | NUMERIC(5,2) | | `7.00` |
| `quotation_number_prefix` | VARCHAR(10) | | `QUO` |
| `quotation_number_next` | INTEGER | | **Seed from VCS's current counter** (open question B5) |
| `date_format` | VARCHAR(20) | | One enforced format — the samples are inconsistent |

> `company` is the only place bilingual field pairs survive ([ADR-0016](decisions/0016-bilingual-thai-english.md), narrowed). Everywhere else, labels are template constants and entered content is English.

### 3.2 `picklist`

| Column | Type | Null | Notes |
|---|---|---|---|
| `kind` | VARCHAR(30) | | `incoterm` / `unit` / `country` / `document_type` / `task_type` / `lead_source` / `lost_reason` |
| `code` | VARCHAR(50) | | Stable identifier |
| `label` | VARCHAR(255) | | Display |
| `sort_order` | SMALLINT | | |
| `is_active` | BOOLEAN | | Retire without deleting — old records must still render |

`UNIQUE (kind, code)` · index on `(kind, is_active, sort_order)`

One table rather than seven keeps the admin uniform and adding an eighth kind free.

### 3.3 `note_snippet`

Reusable text — the Hazardous Substances Control Bureau import-permission paragraph is the motivating case.

| Column | Type | Null | Notes |
|---|---|---|---|
| `title` | VARCHAR(255) | | |
| `category` | VARCHAR(20) | | `lead_time` / `regulatory` / `terms` / `other` |
| `body` | TEXT | | |
| `is_active` | BOOLEAN | | |

### 3.4 `user`

Managed by **Better Auth** ([ADR-0042](decisions/0042-nextjs-stack-choices.md)), which owns its own session and account tables alongside this one.

| Column | Type | Null | Notes |
|---|---|---|---|
| `name` | VARCHAR(255) | | |
| `email` | VARCHAR(254) | | Unique. Login identifier |
| `phone_mobile` | VARCHAR(50) | ✓ | **Prints in the quotation Sales Person column** — required for anyone issuing quotations. Enforced in the form, not the schema |
| `role` | VARCHAR(20) | | `ceo` / `finance` / `sales_engineer` / `sales_manager`. **Stored, not enforced in Phase 1** ([ADR-0006](decisions/0006-single-tenant-flat-permissions.md)) |
| `is_active` | BOOLEAN | | |

Password hashing **Argon2id** (`@node-rs/argon2`); PDPA baseline in [`04-infrastructure.md`](04-infrastructure.md).

## 4. Accounts and people

### 4.1 `account`

| Column | Type | Null | Notes |
|---|---|---|---|
| `name` | VARCHAR(255) | | |
| `types` | VARCHAR(30)[] | | **Multi-select**: `client` / `supplier` / `manufacturer` / `service_provider` / `logistics` ([ADR-0034](decisions/0034-principal-folded-into-account-types.md)) |
| `tax_id` | VARCHAR(20) | ✓ | Prints on the quotation |
| `tax_branch` | VARCHAR(100) | ✓ | e.g. `Head Office`. **A Thai tax requirement — a stored field, not typed each time** |
| `address` | TEXT | ✓ | |
| `industry` | VARCHAR(100) | ✓ | |
| `country_id` | FK → picklist | ✓ | `kind = country` |
| `default_currency` | CHAR(3) | | `THB` |
| `default_payment_term` | VARCHAR(255) | ✓ | Free text — samples show `Cash`, `30 days after the date of invoice` |
| `owner_user_id` | FK → user | ✓ | |
| `status` | VARCHAR(20) | | `active` / `inactive` / `prospect` |

Index: GIN on `types` · `name` trigram for search · `(status, owner_user_id)`

> **Postgres array over a join table.** A `text[]` column with a GIN index gives `types @> ARRAY['client']` cheaply, and at five users and a few hundred accounts a join table buys nothing. Drizzle supports array columns; the GIN index is declared in the migration. The trade-off is no referential integrity on the values — acceptable because the five roles are structural and will not be edited by the client.

> `owner_user_id` and `default_payment_term` are client-oriented and meaningless on a logistics company. Nullable, and the UI should not demand them for non-client accounts.

### 4.2 `person`

| Column | Type | Null | Notes |
|---|---|---|---|
| `account_id` | FK → account | | CASCADE |
| `name` | VARCHAR(255) | | |
| `position`, `department` | VARCHAR(255) | ✓ | |
| `email` | VARCHAR(254) | ✓ | Prints in the Attention box |
| `phone`, `mobile` | VARCHAR(50) | ✓ | |
| `line_id` | VARCHAR(100) | ✓ | Messaging ID — normal in Thai B2B |
| `is_primary` | BOOLEAN | | |
| `decision_role` | VARCHAR(20) | ✓ | `technical` / `commercial` / `decision_maker` |

Index: `(account_id, is_primary)` · `name` trigram

Partial unique index enforcing one primary per account:
```sql
CREATE UNIQUE INDEX person_one_primary_per_account
  ON person (account_id) WHERE is_primary;
```

## 5. Project

### 5.1 `project`

| Column | Type | Null | Notes |
|---|---|---|---|
| `project_no` | VARCHAR(30) | ✓ | Human reference. **Open question N7** — needed at all? |
| `name` | VARCHAR(255) | | |
| `account_id` | FK → account | | PROTECT |
| `primary_person_id` | FK → person | ✓ | SET NULL |
| `type` | VARCHAR(20) | | `consumable` / `equipment` / `part` / `service` |
| `progress` | SMALLINT | | `CHECK (progress IN (10,20,...,100))` |
| `status` | VARCHAR(10) | | `open` / `won` / `lost` |
| `lost_reason_id` | FK → picklist | ✓ | `kind = lost_reason`. **Required when status = lost** |
| `lost_note` | TEXT | ✓ | |
| `competitor` | VARCHAR(255) | ✓ | Captured at Lost — the most useful field in a loss report |
| `expected_amount` | NUMERIC(15,2) | ✓ | **Forecast only** ([ADR-0030](decisions/0030-order-record-per-po.md)) |
| `quoted_value` | NUMERIC(15,2) | ✓ | **Derived** — latest issued quotation total. Maintained by the app |
| `currency` | CHAR(3) | | |
| `expected_close_date` | DATE | ✓ | |
| `owner_user_id` | FK → user | | PROTECT |
| `lead_source_id` | FK → picklist | ✓ | |
| `followup_interval_days` | SMALLINT | ✓ | Consumable only. Drives recurrence |
| `followup_paused` | BOOLEAN | | Default false. **Distinct from "no interval set"** |
| `parent_project_id` | FK → project | ✓ | Part → Equipment ([ADR-0029](decisions/0029-project-types-and-repeat-orders.md)) |

**Constraints**

```sql
-- Lost requires a reason
CHECK (status <> 'lost' OR lost_reason_id IS NOT NULL)

-- Only Part projects may have a parent
CHECK (parent_project_id IS NULL OR type = 'part')

-- No self-parent (deeper cycles guarded in the application)
CHECK (parent_project_id IS NULL OR parent_project_id <> id)

-- Follow-up interval only meaningful for consumables
CHECK (followup_interval_days IS NULL OR type = 'consumable')
```

**Indexes**

```sql
(status, progress)                                  -- pipeline
(owner_user_id, status)                             -- my projects
(account_id)
(type, status) WHERE type = 'consumable'            -- reorder cohort
(parent_project_id) WHERE parent_project_id IS NOT NULL
(expected_close_date) WHERE status = 'open'
```

> **`quoted_value` is denormalised on purpose.** It is a rollup of the latest issued `quotation.grand_total`, and it is stored rather than computed because the pipeline query would otherwise need a correlated subquery per row on every load. Maintained in one place — the quotation issue/revise transaction — and recomputable by a management command. [ADR-0030](decisions/0030-order-record-per-po.md) explains why it is retained against the client spec.

> **Not stored: actual revenue.** It is `SUM(order.amount)` where `NOT is_void`. Never denormalised, because unlike `quoted_value` it changes from several directions.

### 5.2 `project_history`

Not optional. Without it, days-in-stage, lost-at-stage, and regression reporting are all impossible and none can be reconstructed later ([ADR-0028](decisions/0028-progress-and-status-are-independent.md)).

| Column | Type | Null | Notes |
|---|---|---|---|
| `project_id` | FK → project | | CASCADE |
| `field` | VARCHAR(20) | | `progress` / `status` |
| `from_value` | VARCHAR(20) | ✓ | Null on creation |
| `to_value` | VARCHAR(20) | | |
| `changed_by_id` | FK → user | ✓ | |
| `changed_at` | TIMESTAMPTZ | | |

Index: `(project_id, changed_at)` · `(field, to_value, changed_at)` for lost-at-stage

Written by the application on every change — including **backwards** progress movement, which is normal and is itself a reportable signal.

## 6. Quotation

### 6.1 `quotation`

| Column | Type | Null | Notes |
|---|---|---|---|
| `project_id` | FK → project | | **NOT NULL** — PROTECT ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) |
| `quotation_no` | VARCHAR(30) | | `QUO#####`, global sequence |
| `revision` | SMALLINT | | Default 1 |
| `status` | VARCHAR(20) | | `draft` / `issued` / `superseded` / `accepted` / `expired` |
| `quotation_date` | DATE | | |
| `issued_at` | TIMESTAMPTZ | ✓ | Set once, at issue |
| **Client snapshot** | | | Copied at issue, never joined live |
| `bill_to_name` | VARCHAR(255) | ✓ | |
| `bill_to_address` | TEXT | ✓ | |
| `bill_to_tax_id` | VARCHAR(20) | ✓ | |
| `bill_to_branch` | VARCHAR(100) | ✓ | |
| **Attention** | | | |
| `attention_person_id` | FK → person | ✓ | SET NULL |
| **Terms** — header level | | | |
| `currency` | CHAR(3) | | Selling currency |
| `cost_currency` | CHAR(3) | ✓ | Currency all line costs are entered in. Often `EUR` ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) |
| `fx_rate_cost_to_selling` | NUMERIC(14,6) | ✓ | Manually entered, **frozen at issue**. `1.0` when currencies match |
| `validity_text` | VARCHAR(255) | ✓ | **Text, not a date** — `See below`, `Until 30/6/2026` |
| `delivery_date_text` | VARCHAR(255) | ✓ | Text |
| `payment_term_text` | VARCHAR(255) | ✓ | Text — `Cash`, `30 days after the date of invoice` |
| `incoterm_id` | FK → picklist | ✓ | |
| `country_of_origin_id` | FK → picklist | ✓ | |
| `lead_time_text` | TEXT | ✓ | **Long text.** QUO69054's is a conditional paragraph about import permission |
| `remarks` | TEXT | ✓ | |
| **Tax** | | | |
| `vat_applied` | BOOLEAN | | Default true. Off for export / zero-rated |
| `vat_rate` | NUMERIC(5,2) | | Snapshotted from company |
| `wht_note` | TEXT | ✓ | Service projects |
| **Totals** — calculated, stored | | | |
| `subtotal` | NUMERIC(15,2) | | |
| `discount_total` | NUMERIC(15,2) | | |
| `vat_amount` | NUMERIC(15,2) | | |
| `grand_total` | NUMERIC(15,2) | | |
| **Internal — never printed** | | | |
| `total_cost` | NUMERIC(15,2) | ✓ | In quotation currency |
| `total_margin` | NUMERIC(15,2) | ✓ | |
| `salesperson_user_id` | FK → user | | Name + mobile print in the header bar |

**Constraints**

```sql
UNIQUE (quotation_no, revision)
CHECK (status = 'draft' OR issued_at IS NOT NULL)
CHECK (subtotal >= 0 AND grand_total >= 0)

-- Cannot issue with a missing rate when cost and selling currencies differ.
-- Enforced in the application at issue time; a null margin must never ship silently.
-- (status <> 'draft' AND cost_currency <> currency) → fx_rate_cost_to_selling IS NOT NULL
```

**Indexes**

```sql
(project_id, status)
(status, issued_at)                    -- "awaiting client", oldest first
(quotation_no)                         -- search by printed number
```

> **Why the client block is snapshotted.** An issued quotation is a document a customer holds. If the fields were joined live to `account`, editing an address next month would silently change what an already-sent quotation reprints as. That is unacceptable for a commercial document, so the values are copied at issue. Same principle applies to `vat_rate` and to line-level FX rates.

> **Totals are stored, not computed on read.** They are frozen at issue along with everything else, so a reprint years later is byte-identical. Drafts recompute on save.

### 6.2 `quotation_line`

| Column | Type | Null | Notes |
|---|---|---|---|
| `quotation_id` | FK → quotation | | CASCADE |
| `sequence` | SMALLINT | | Print order |
| `item_code` | VARCHAR(100) | ✓ | **Free text** ([ADR-0032](decisions/0032-product-master-deferred-to-phase-2.md)) |
| `item_name` | VARCHAR(500) | | Free text |
| `quantity` | NUMERIC(12,3) | | Plain quantity, despite the printed MOQ label |
| `unit_id` | FK → picklist | ✓ | `ea`, `SET` |
| `moq_note` | VARCHAR(255) | ✓ | Optional. Client A2: skip unless asked |
| `unit_price` | NUMERIC(15,2) | | **Net of VAT** ([ADR-0021](decisions/0021-quotation-tax-treatment.md)) |
| `discount_type` | VARCHAR(10) | ✓ | `amount` / `percent` — **open question B3** |
| `discount_value` | NUMERIC(15,2) | ✓ | |
| `amount` | NUMERIC(15,2) | | Calculated |
| **Internal — never printed** | | | |
| `unit_cost` | NUMERIC(15,2) | ✓ | In `quotation.cost_currency` — **not** per-line ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) |
| `line_cost`, `line_margin` | NUMERIC(15,2) | ✓ | In the quotation's selling currency |
| `image` | VARCHAR(255) | ✓ | Per-line photo, printed beside components |
| `line_notes` | TEXT | ✓ | |

`UNIQUE (quotation_id, sequence)` · index `(quotation_id, sequence)`
Autocomplete index: `item_code` and `item_name` trigram, plus `(item_code, created_at DESC)`

> **The FX rate is an addition to the client specification, and it is not optional.** The spec puts `cost_currency` on the line and a single selling currency on the quotation, and defers FX to Phase 2. But cost in EUR against a price in THB makes `line_margin` uncomputable — and margin reporting is the *stated reason* for capturing cost at all. Without a rate, `total_margin` is wrong or null on the majority of quotations.
>
> **It sits on the quotation header, not the line** ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)). A per-line rate lets an engineer enter eight slightly different EUR rates on one document — silently wrong, with no error and no null, just a plausible total. One rate per document cannot be internally inconsistent. The cost: **all lines on a quotation must share one cost currency.**

**Line arithmetic**

```
gross      = quantity × unit_price
discount   = discount_type = 'percent' ? gross × discount_value/100 : discount_value
amount     = gross − discount
line_cost  = quantity × unit_cost × quotation.fx_rate_cost_to_selling
line_margin= amount − line_cost
```

Rounding is applied **once, at document total**, not per line — per-line rounding drift compounds and makes a customer-facing total look wrong.

### 6.3 `quotation_component`

The un-priced kit breakdown — QUO69041 lists eleven components inside one line's description.

| Column | Type | Null | Notes |
|---|---|---|---|
| `quotation_line_id` | FK → quotation_line | | CASCADE |
| `sequence` | SMALLINT | | |
| `quantity` | NUMERIC(12,3) | | |
| `item_code` | VARCHAR(100) | ✓ | Free text |
| `item_name` | VARCHAR(500) | | |

`UNIQUE (quotation_line_id, sequence)`

**No prices.** Components describe what is inside a priced set. Giving them a price column would invite someone to sum them and disagree with the line.

### 6.4 `quotation_cc`

QUO69041 shows a cc list, so a quotation references more than one person.

| Column | Type | Notes |
|---|---|---|
| `quotation_id` | FK → quotation | CASCADE |
| `person_id` | FK → person | PROTECT |

`UNIQUE (quotation_id, person_id)`

### 6.5 Quotation number allocation

```sql
UPDATE company
   SET quotation_number_next = quotation_number_next + 1
 WHERE id = 1
RETURNING quotation_number_next - 1;
```

A single-row `UPDATE … RETURNING` inside the issue transaction. The row lock serialises concurrent issues, which at five users will effectively never contend — but a gap-free-looking sequence must not produce duplicates.

**Numbers are consumed, not reused.** A deleted draft that was never issued consumes nothing (allocation happens at issue, not creation). Seed `quotation_number_next` from VCS's current counter (**B5**).

**Revisions:** suffix recommended — `revision` increments, `quotation_no` stays. Pending **B4**.

## 7. `order`

One record per purchase order ([ADR-0030](decisions/0030-order-record-per-po.md)).

> **`order` is a reserved word in SQL.** Drizzle quotes identifiers it generates, but migrations and any hand-written SQL must use `"order"`. **Recommend `purchase_order` as the physical table name** — with a thinner ORM than Django's there is more hand-written SQL in a project's life, and this is a cheap way to never think about it again.

| Column | Type | Null | Notes |
|---|---|---|---|
| `project_id` | FK → project | | PROTECT |
| `po_number` | VARCHAR(100) | | Client's reference |
| `po_date` | DATE | | **Drives the follow-up clock** |
| `source_quotation_id` | FK → quotation | ✓ | **Optional** — repeat orders often arrive against a standing price |
| `amount` | NUMERIC(15,2) | | |
| `currency` | CHAR(3) | | |
| `status` | VARCHAR(20) | | `ordered` / `delivered` / `invoiced` |
| `is_void` | BOOLEAN | | POs get cancelled. **Void, do not delete** |

Index: `(project_id, po_date DESC) WHERE NOT is_void` — this is the query the recurrence scheduler runs

> **`status = 'invoiced'` is a user assertion, not evidence.** The CRM does not issue invoices ([ADR-0018](decisions/0018-no-erp-invoice-boundary.md)). Reports must not present it as a financial fact.

## 8. Activity

Task and Meeting are **separate tables**, per the client's model. [ADR-0005](decisions/0005-unified-activity-timeline.md) had merged them; they have diverged enough — duration, mode, and attendees on one; recurrence on the other — that the split is right. The cost is that the project timeline view unions two tables.

### 8.1 `task`

| Column | Type | Null | Notes |
|---|---|---|---|
| `title` | VARCHAR(255) | | |
| `description` | TEXT | ✓ | |
| `type_id` | FK → picklist | ✓ | `kind = task_type` |
| `status` | VARCHAR(20) | | `open` / `in_progress` / `done` / `cancelled` |
| `due_date` | DATE | ✓ | |
| `completed_date` | DATE | ✓ | |
| `assignee_user_id` | FK → user | | PROTECT |
| `project_id` | FK → project | ✓ | **Nullable** ([ADR-0027](decisions/0027-adopt-client-phase-1-specification.md)) |
| `account_id` | FK → account | ✓ | |
| `person_id` | FK → person | ✓ | |
| `is_auto_generated` | BOOLEAN | | Reorder follow-ups |
| `recurrence_parent_task_id` | FK → task | ✓ | Chain |

**Constraints**

```sql
CHECK (status <> 'done' OR completed_date IS NOT NULL)
CHECK (recurrence_parent_task_id IS NULL OR recurrence_parent_task_id <> id)
```

**Indexes**

```sql
(assignee_user_id, status, due_date)                     -- My Tasks
(project_id) WHERE project_id IS NOT NULL
(recurrence_parent_task_id) WHERE recurrence_parent_task_id IS NOT NULL
(is_auto_generated, status) WHERE is_auto_generated
```

A task may attach to a project, an account, a person, or **nothing** — which is why *My Tasks* is the landing page rather than a per-project hunt.

### 8.2 `meeting`

| Column | Type | Null | Notes |
|---|---|---|---|
| `title` | VARCHAR(255) | | |
| `agenda`, `outcome_notes` | TEXT | ✓ | |
| `status` | VARCHAR(20) | | `planned` / `completed` / `cancelled` / `no_show` |
| `meeting_date` | DATE | | |
| `start_time` | TIME | ✓ | |
| `duration_hours` | NUMERIC(4,2) | ✓ | |
| `mode` | VARCHAR(20) | | `client_site` / `office` / `online` / `phone` |
| `location` | VARCHAR(255) | ✓ | |
| `account_id` | FK → account | ✓ | |

Index: `(meeting_date DESC)` · `(account_id, meeting_date DESC)`

**No `project_id`.** A meeting may cover several projects or none.

### 8.3 `meeting_project`

| Column | Type | Notes |
|---|---|---|
| `meeting_id` | FK → meeting | CASCADE |
| `project_id` | FK → project | CASCADE |

`UNIQUE (meeting_id, project_id)`

> **Meeting hours are reported per account and per user, never per project.** A 3-hour visit covering two projects is not 6 hours of effort, and splitting it evenly invents precision that does not exist. The join table stores the association; reporting deliberately does not divide the duration ([ADR-0027](decisions/0027-adopt-client-phase-1-specification.md), pending N3).

### 8.4 `meeting_attendee`

Internal users and external contacts in one list.

| Column | Type | Null | Notes |
|---|---|---|---|
| `meeting_id` | FK → meeting | | CASCADE |
| `person_id` | FK → person | ✓ | External |
| `user_id` | FK → user | ✓ | Internal |

```sql
CHECK ((person_id IS NOT NULL) <> (user_id IS NOT NULL))   -- exactly one
```

Two partial unique indexes prevent duplicates:
```sql
CREATE UNIQUE INDEX ON meeting_attendee (meeting_id, person_id) WHERE person_id IS NOT NULL;
CREATE UNIQUE INDEX ON meeting_attendee (meeting_id, user_id)   WHERE user_id   IS NOT NULL;
```

## 9. `document`

| Column | Type | Null | Notes |
|---|---|---|---|
| `project_id` | FK → project | | CASCADE |
| `doc_type_id` | FK → picklist | | `kind = document_type` |
| `file` | VARCHAR(255) | | Media path |
| `original_filename` | VARCHAR(255) | ✓ | |
| `version` | SMALLINT | | Default 1 |
| `issue_date` | DATE | ✓ | The date **on** the document, not the upload date |
| `status` | VARCHAR(20) | | `draft` / `sent` / `accepted` / `superseded` |
| `is_generated` | BOOLEAN | | True for system-produced quotation PDFs |
| `source_quotation_id` | FK → quotation | ✓ | Set when generated |

Index: `(project_id, doc_type_id, issue_date DESC)` · `(source_quotation_id) WHERE source_quotation_id IS NOT NULL`

```sql
CHECK (NOT is_generated OR source_quotation_id IS NOT NULL)
```

Uploaded by users, **except quotations**, which file themselves at issue ([ADR-0013](decisions/0013-documents-are-collected-not-authored.md)).

## 9a. `expense`

Minimal capture — the "sales allowance" ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)). Capture only in Phase 1: no approval, no reimbursement status.

| Column | Type | Null | Notes |
|---|---|---|---|
| `expense_date` | DATE | | |
| `category` | VARCHAR(20) | | `travel` / `fuel` / `accommodation` / `entertainment` / `other`. **No per-diem** — VCS pays none, so every expense is receipt-backed |
| `amount` | NUMERIC(15,2) | | |
| `currency` | CHAR(3) | | Trips abroad are expensed locally |
| `receipt_image` | VARCHAR(255) | ✓ | Photographed from a phone ([ADR-0038](decisions/0038-responsive-web-desktop-first.md)) |
| `note` | VARCHAR(255) | ✓ | |
| `incurred_by_user_id` | FK → user | | PROTECT |
| `project_id` | FK → project | ✓ | Optional |
| `meeting_id` | FK → meeting | ✓ | Optional — usually the visit that incurred it |

```sql
CHECK (amount > 0)
```

Index: `(incurred_by_user_id, expense_date DESC)` · `(project_id) WHERE project_id IS NOT NULL`

> **⚠️ This is the only table with an enforced permission rule in Phase 1.** An expense row is visible to `incurred_by_user` and to `sales_manager` / `ceo` roles, and to nobody else — including deal-level totals ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md), [ADR-0017](decisions/0017-expense-visibility-restriction.md)).
>
> **Enforce in `lib/data/expenses.ts`, which is the only module permitted to import this table, and which exports no unscoped query** ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G1). Under Django this was good practice; with Drizzle there is no default-manager equivalent, so **the module boundary is the entire mechanism**. A hidden button is not a permission, and neither is a `WHERE` clause someone remembered to write.
>
> **Two Next.js-specific hazards, both of which defeat the rule silently:**
> - **A Server Action is a public POST endpoint.** `{expenseId: 42}` is well-formed and may be someone else's — ownership must be in the `WHERE` clause, not checked beforehand ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G1).
> - **A prop passed to a Client Component ships to the browser even if unused.** Passing full rows to a list component leaks every field of every row, including ones filtered out client-side. Pass fields, not objects ([ADR-0042](decisions/0042-nextjs-stack-choices.md) G2).
>
> Receipt images are served through the authenticated media route — an unguessable URL is not access control ([`04-infrastructure.md`](04-infrastructure.md) §6).
>
> The restriction exists for **data quality**, not comfort: capture is voluntary in Phase 1, so if colleagues can see the records people record less or record elsewhere. That produces an empty dataset, not a slightly worse one.

## 10. The PDF field whitelist

The highest-severity constraint in the build. `unit_cost`, `cost_currency`, `fx_rate_cost_to_selling`, `line_cost`, `line_margin`, `total_cost`, and `total_margin` **must never reach the exported PDF** ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)).

Enforced structurally, not by hiding columns:

```python
# Printed on the quotation. Nothing outside this list is available to the template.
PDF_QUOTATION_FIELDS = {
    "quotation_no", "revision", "quotation_date",
    "bill_to_name", "bill_to_address", "bill_to_tax_id", "bill_to_branch",
    "validity_text", "delivery_date_text", "payment_term_text",
    "currency", "incoterm", "country_of_origin", "lead_time_text",
    "remarks", "wht_note", "vat_applied", "vat_rate",
    "subtotal", "discount_total", "vat_amount", "grand_total",
    "salesperson_name", "salesperson_mobile",
    "attention_name", "attention_email", "attention_phone", "cc_names",
}

PDF_LINE_FIELDS = {
    "sequence", "item_code", "item_name", "quantity", "unit",
    "unit_price", "discount_display", "amount",
    "image_url", "components", "line_notes",
}
```

**Three properties make this safe:**

1. The render service receives **plain UI-shaped objects**, not database rows, built from an explicit allowlist. A template referencing `unit_cost` has nothing to resolve — it renders empty rather than leaking.
2. `build_quotation_pdf_context()` is the only path to the renderer, and it constructs output from these sets explicitly.
3. **An automated test** renders a quotation whose cost fields hold distinctive sentinel values, extracts the PDF text, and asserts none appear. *That test is the guarantee; the whitelist is how it keeps passing.*

The failure mode changes from "leaks silently" to "renders blank" — the right direction for a number that must never reach a customer.

## 11. Derived values — where each is computed

| Value | How | Where |
|---|---|---|
| `quotation_line.amount`, `line_cost`, `line_margin` | Line arithmetic (§6.2) | On save |
| `quotation.subtotal/vat_amount/grand_total/total_cost/total_margin` | Sum of lines | On save; **frozen at issue** — including `fx_rate_cost_to_selling` |
| `project.quoted_value` | Latest issued revision's `grand_total` | Issue/revise transaction. Recomputable by command |
| Project actual revenue | `SUM(order.amount) WHERE NOT is_void` | Query. **Never stored** |
| Pipeline value | `Σ COALESCE(quoted_value, expected_amount) × progress/100` where `status='open'` | Query |
| Days in stage | From `project_history` | Query |
| Next follow-up due | `MAX(order.po_date) + followup_interval_days` | Scheduler |
| Autocomplete suggestions | Distinct `item_code`/`item_name` over `quotation_line`, ranked recency then frequency | Query |

## 12. Reports the model supports

Confirming the client's §5 is achievable:

| Report | Reads |
|---|---|
| Pipeline weighted by progress | `project` |
| Win/loss rate | `project.status` |
| **Lost at what stage** | `project.progress` frozen at loss ✅ *the reason for two fields* |
| Margin per project / per line | `quotation_line.line_margin` — **requires `quotation.fx_rate_cost_to_selling`** ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)) |
| Activity per user: meetings, hours, tasks | `meeting`, `meeting_attendee`, `task` |
| Follow-up compliance | `task.is_auto_generated` + status |
| Spare-part revenue traced to equipment | `project.parent_project_id` + `order` |
| Quoted vs ordered | `quoted_value` vs `SUM(order.amount)` — carried over from [ADR-0026](decisions/0026-opportunity-value-not-line-items.md) |
| Cost of sales *(Phase 2)* | `expense` — Phase 1 captures the data so the Phase 2 report has history ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)). **Manager/CEO only** |

**Not supported in Phase 1:** product-level reporting (no product master — [ADR-0032](decisions/0032-product-master-deferred-to-phase-2.md)) and manufacturer-level reporting (`country_of_origin` is a coarse proxy — [ADR-0034](decisions/0034-principal-folded-into-account-types.md)). Report definitions must not imply otherwise.

## 13. Migration notes

- **No data migration.** Clean start ([ADR-0027](decisions/0027-adopt-client-phase-1-specification.md)). An optional CSV import for accounts and people only, if the client has a list (N9).
- Seed order: `company` (with the real quotation counter) → picklists → users → note snippets.
- **Picklists must be seeded before anything else references them.** A quotation cannot be issued without Incoterm and Country values.
- Declared in `db/schema.ts`, mirroring this document. **19 tables** — `company`, `picklist`, `note_snippet`, `user`, `account`, `person`, `project`, `project_history`, `quotation`, `quotation_line`, `quotation_component`, `quotation_cc`, `order`, `task`, `meeting`, `meeting_project`, `meeting_attendee`, `document`, `expense`. Small enough that a single initial migration is appropriate.

## 14. Open items affecting the schema

| # | Question | Affects |
|---|---|---|
| **B3** | Discount as amount or percentage? | `discount_type` may be unnecessary if only one form is used |
| **B4** | Revision numbering — suffix or new number? | Whether `UNIQUE (quotation_no, revision)` is right |
| **B5** | Current quotation counter value | `company.quotation_number_next` seed |
| **B7** | Do progress and status interact? | Whether a constraint links them |
| **B8** | Progress labels 40 / 60 / 80 | Display only — no schema impact |
| **B9** | Lost reason codes | Picklist seed data |
| **N6** | Final document type list | Picklist seed data |
| **N7** | Does a project need its own number? | `project_no` may be droppable |
| **N10** | Broader audit logging? | Would add a generic audit table; `created_by`/`updated_by` is the current floor |
| **B11** | **Does a quotation ever mix two cost currencies?** The FX rate is on the header, so all line costs share one currency ([ADR-0040](decisions/0040-fx-rate-at-quotation-level.md)). If this happens often, the rate moves to the line | Quotation schema |
| **Q11** | Statutory retention period for expense receipts in Thailand | Deletion policy, not schema |
| — | Confirm minimal expense capture with the client — an addition to their Phase 1 scope ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) | Scope |

---

*Next: [`03-tech-stack.md`](03-tech-stack.md) · [`04-infrastructure.md`](04-infrastructure.md)*
