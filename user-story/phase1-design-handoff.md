# Phase 1 — Design Handoff

**Contains:** multi-page quotation behaviour, proposed entity design, and the pending questions that must be answered before UI design, stack selection, and infrastructure work begin.

---

# Part A — Multi-Page Quotation

Confirmed: a quotation behaves like a spreadsheet print — when line items overflow, the document continues onto further pages carrying the same header and footer, with `Page 1/3`, `Page 2/3`, and so on.

## A1. What repeats on every page

| Block | Every page | Page 1 only | Last page only |
|---|---|---|---|
| Logo, company name, address, tel | ● | | |
| ใบเสนอราคา / QUOTATION title box | ● | | |
| Client box + Attention box | ? | ? | |
| Header bar (No. / Date / Validity / Delivery / Payment / Salesperson) | ? | ? | |
| Line table column headings | ● | | |
| Line items | ● | | |
| Terms block (currency, Incoterm, lead time, origin) | | | ● |
| Thank-you text | | | ● |
| Total / VAT / Grand Total | | | ● |
| Page x/y | ● | | |

Two rows are marked with `?` — see question D1. Common practice is to repeat the quotation number on every page (so a detached page is identifiable) while showing the full client and attention boxes only on page 1. This needs confirming.

## A2. Page break rules

- A line item should **not split across pages**. If a line with a long component list or an image will not fit in the remaining space, it moves whole to the next page.
- If a single line item is taller than one full page (a kit with 40 components), it must be allowed to break, with the description continuing on the next page.
- The terms block, thank-you text, and totals travel together. If they will not fit after the last line item, they move to a fresh final page — the totals must never appear alone without at least the terms block above them.

## A3. Carried-forward subtotals

**Open decision.** Two options when a quotation spans pages:

- **(a) Continuous** — totals appear only on the last page. Simplest, and matches how the current single-page samples read.
- **(b) Carried forward** — each page ends with a running subtotal and the next begins with "brought forward". Common in formal Thai commercial documents and useful when a client reviews a long quotation page by page.

Recommend (a) unless the user has a reason to prefer (b). It is easier to build and easier to read.

## A4. Technical note — this drives the PDF approach

Repeating headers, non-splitting rows, and `Page x/y` numbering are exactly the requirements that make naive PDF generation fail. This is not a formatting detail; it constrains the technology choice. See Part C, question C4.

---

# Part B — Proposed Entity Design

Presented for review, not as a final schema. Field types are indicative.

## B1. Entity map

```
Company (settings)
User

Account ──1:N── Person
   │
   ├──1:N── Project
   │            │
   │            ├──1:N── ProjectHistory
   │            ├──1:N── Task ──────────┐
   │            ├──1:N── Meeting ──N:M──┤── Person
   │            ├──1:N── Document       │
   │            ├──1:N── Quotation      │
   │            │            ├──1:N── QuotationLine ──1:N── QuotationComponent
   │            │            └──N:M── Person (cc)
   │            └──0:1── Project (parent equipment)
   │
   └──(supplier role reserved for Phase 2)

NoteSnippet
Picklist values: Incoterm, Unit, Country, DocumentType, TaskType, LeadSource, LostReason
```

## B2. Core entities

### Company
Singleton holding what prints on every document.
`name_th`, `name_en`, `address_th`, `address_en`, `phone`, `tax_id`, `logo`, `quotation_footer_text_th`, `quotation_footer_text_en`, `default_vat_rate`

### User
`name`, `email`, `phone_mobile`, `role` (ceo / finance / sales_engineer / sales_manager), `is_active`

`phone_mobile` prints in the quotation Sales Person column, so it is required for anyone who issues quotations.

### Account
`name`, `types[]` (multi-select: client / supplier / manufacturer / service_provider / logistics), `tax_id`, `tax_branch` (e.g. "Head Office"), `address`, `industry`, `default_currency`, `default_payment_term`, `owner_user`, `status`

### Person
`account`, `name`, `position`, `department`, `email`, `phone`, `mobile`, `line_id`, `is_primary`, `decision_role` (technical / commercial / decision_maker)

### Project
`project_no`, `name`, `account`, `primary_person`, `type` (consumable / equipment / part / service), `progress` (10–100 in steps of 10), `status` (open / won / lost), `lost_reason`, `amount`, `currency`, `expected_close_date`, `owner_user`, `lead_source`, `followup_interval_days`, `parent_project` (Part → Equipment, optional), `created_at`, `updated_at`

### ProjectHistory
`project`, `field` (progress / status), `from_value`, `to_value`, `changed_by`, `changed_at`

Written automatically. Powers days-in-stage and lost-at-stage reporting.

### Task
`title`, `description`, `type`, `status`, `due_date`, `completed_date`, `assignee_user`, `project`, `account`, `person`, `is_auto_generated`, `recurrence_parent_task`

Order follow-up tasks are created automatically on won consumable projects at `followup_interval_days`. Completing one generates the next.

### Meeting
`title`, `agenda`, `outcome_notes`, `status`, `meeting_date`, `start_time`, `duration_hours`, `mode` (client_site / office / online / phone), `location`, `project`, `created_by`

### MeetingAttendee
`meeting`, `person` **or** `user`

Separate table because a meeting has both external contacts and internal staff.

### Quotation
Header data for one issued document.

`project`, `quotation_no`, `revision`, `status` (draft / issued / superseded / accepted / expired), `quotation_date`, `validity_text`, `delivery_date_text`, `payment_term_text`, `currency`, `incoterm`, `country_of_origin`, `lead_time_text` (long), `remarks`, `vat_applied` (bool), `vat_rate`, `salesperson_user`, `attention_person`, `subtotal`, `discount_total`, `vat_amount`, `grand_total`, `total_cost`, `total_margin`

**Client snapshot fields:** `bill_to_name`, `bill_to_address`, `bill_to_tax_id`, `bill_to_branch`

These are copied from the Account at issue time rather than joined live. Without the snapshot, editing an account address later would silently change what an already-issued quotation reprints as. For a document a client has received, that is unacceptable.

`validity_text`, `delivery_date_text`, and `payment_term_text` are text rather than dates because the samples contain values like `Cash`, `30 days after the date of invoice`, and `See below`.

### QuotationCc
`quotation`, `person`

### QuotationLine
`quotation`, `sequence`, `item_code` (free text), `item_name`, `quantity`, `unit`, `unit_cost`, `cost_currency`, `unit_price`, `discount_type`, `discount_value`, `amount`, `image`, `line_notes`

`unit_cost`, `cost_currency`, and any derived margin are **internal only and must never render on the exported PDF**.

### QuotationComponent
`quotation_line`, `sequence`, `quantity`, `item_code`, `item_name`

Models the eleven-part kit breakdown seen in QUO69041. No prices — components describe what is inside a priced set.

### Document
`project`, `doc_type`, `file`, `version`, `issue_date`, `uploaded_by`, `status`, `is_generated`, `source_quotation`

Generated quotation PDFs file themselves here automatically with `is_generated = true`.

### NoteSnippet
`title`, `category` (lead_time / regulatory / terms / other), `body`

Holds reusable text such as the Hazardous Substances Control Bureau import-permission paragraph.

## B3. Two design decisions worth highlighting

**Snapshot the client on the quotation.** Explained above. The same principle will apply to cost and FX in Phase 2.

**Terms sit on the Quotation, not the line.** The samples print them inside the description cell of line 1, but they describe the whole offer. Placing them on the header avoids repetition across many lines. This is pending confirmation — see question D2.

---

# Part C — Pending Questions: Stack and Infrastructure

## Deployment and hosting

**C1. Cloud or on-premise?** With five users and no ERP integration, cloud hosting is the obvious default, but confirm there is no policy requiring the system to sit inside the company network.

**C2. Hosting region.** Client contact names, emails, and phone numbers are personal data under Thailand's PDPA. Is there a requirement to host in Thailand or in a specific region? This affects provider choice.

**C3. Budget and timeline.** What is the target date for Phase 1, and is there a monthly hosting budget ceiling? At this scale, running costs should be modest, but it shapes decisions such as managed database versus self-hosted.

## PDF generation — the highest technical risk in Phase 1

**C4. What generates the PDF?** The quotation needs repeating headers, rows that do not split, `Page x/y` numbering, embedded images, and a totals block that stays with its terms. Options broadly are HTML-to-PDF via a headless browser, a dedicated PDF library, or rendering through a document template. The choice should be made deliberately and prototyped early with a real three-page quotation, because retrofitting page-break control into the wrong tool is expensive.

**C5. Thai font rendering.** This deserves explicit attention. The template is bilingual, and Thai text has no spaces between words, uses stacked vowel and tone marks above and below the baseline, and requires proper text shaping to break lines correctly. Many PDF toolchains render Thai as boxes, break lines mid-word, or misplace tone marks. Requirements: an embedded Thai font (Sarabun and Noto Sans Thai are the usual choices), correct shaping support, and a rendering test using the actual Thai labels from the samples before the stack is locked.

**C6. Where are files stored?** Generated PDFs, uploaded documents, and per-line product images. Object storage or database blobs? What is the expected volume and retention period? Are files backed up separately from the database?

## Platform and access

**C7. Web only, or mobile too?** Sales engineers log meetings after client visits. If mobile matters, is a responsive web app sufficient, or is a native app expected? Responsive web is almost certainly the right answer at this size, but confirm.

**C8. Offline capability.** Any requirement to create records without a connection? Recommend no for Phase 1 — offline sync is disproportionately expensive.

**C9. Authentication.** The screenshots suggest a Microsoft 365 environment. Should login use Microsoft SSO, Google, or email and password managed by the system? SSO reduces password handling and is worth considering given personal data is stored.

**C10. Build approach.** With five users, is a low-code platform under consideration, or is this a custom build? Worth deciding early: low-code handles the CRM records well, but bilingual multi-page PDF generation with strict layout control is typically where such platforms break down. The quotation output should be the deciding test, not the record management.

## Operations

**C11. Backup and recovery.** Backup frequency and acceptable data loss window? Who restores if something fails?

**C12. Environments.** Is a separate staging environment needed, or is it acceptable to develop and release directly to production with careful testing?

**C13. Audit trail.** Progress and status changes are already logged. Is broader audit logging needed — who edited a quotation, who deleted a record? Relevant if quotations become commercially disputed.

**C14. Data migration.** Is there existing data to import — an account list, contact list, or historical quotations? In what format?

**C15. Locale settings.** Confirm timezone Asia/Bangkok, and that dates use the Christian era rather than the Buddhist era. Both samples show 2026, so C.E. appears correct, but Thai commercial documents sometimes use B.E. and it is cheaper to confirm than to change later.

---

# Part D — Pending Questions: Functional and Entity Design

## Quotation

**D1. Multi-page repetition.** On pages 2 and beyond, do the client box and attention box repeat, or only the quotation number and page number? See table A1.

**D2. Are terms per-quotation or per-line?** Both samples have a single line item, so this is untested. If a quotation contains products from different countries with different lead times, must terms appear per line? This determines whether the terms block belongs on Quotation or QuotationLine.

**D3. Carried-forward subtotals.** Question A3 — continuous totals on the last page only, or running subtotals per page?

**D4. What does "Min. Order Qty" mean?** The column heading says minimum order quantity, but the value multiplies into Amount, so it functions as the quotation quantity. Are these the same thing in practice, or are two columns needed?

**D5. Discount format.** Amount or percentage? Both samples show `-`, so populated behaviour is unknown.

**D6. Revision numbering.** Does a revision keep the number with a suffix (`QUO69054-R2`) or take a new number entirely?

**D7. Number sequence scope.** Is `QUO#####` one continuous counter across all types and years with no reset?

**D8. Is there a page 2 today?** Neither sample shows bank details or terms and conditions. Confirm the quotation is genuinely one page, or supply the missing page.

**D9. A service quotation sample.** Both samples are goods. Service pricing may use man-hours or scope of work and could stress the layout.

**D10. Editable export.** Is PDF sufficient, or is Word or Excel output also needed for clients who require their own form?

## Project

**D11. Revenue on continuing projects.** Still open from the previous round. Since consumable projects stay open across repeat orders, one `amount` field goes stale after the second order, and margin over time becomes uncomputable. Recommend a lightweight Order record holding PO number, date, amount, and source quotation.

**D12. Follow-up start point.** Does the interval count from the won date, or reset from the most recent order?

**D13. Progress labels.** Confirm wording for steps 10 through 100, particularly 40, 60, and 80, which were inferred rather than stated.

**D14. Lost reason codes.** Final list.

**D15. Project numbering.** Does a project need its own reference number, and does it relate to the quotation number?

## Activity

**D16. Can a meeting cover more than one project?** One client visit often covers several. Currently modelled as one project per meeting.

**D17. Can a task exist without a project?** General administrative work, or must everything attach?

**D18. Document types.** Final dropdown list.

**D19. Task assignment.** Can users assign tasks to each other in Phase 1, or is everyone managing only their own?

**D20. Reminders.** Are due-date notifications expected in Phase 1, and by what channel — in-app only, or email?

## Access

**D21. Visibility in Phase 1.** Does everyone see all projects, or does a sales engineer see only their own? An `owner_user` field exists either way, so this can be decided late — but it should be decided before launch rather than after.

---

## Priority

**Blocks entity design:** D1, D2, D4, D11, D16, D17

**Blocks stack selection:** C1, C2, C4, C5, C7, C10

**Blocks infrastructure setup:** C3, C6, C9, C11, C12, C14

**Can resolve during build:** everything else
