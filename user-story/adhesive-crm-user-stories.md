# Sales CRM for Adhesive Distribution — Phase 1 Specification

**Version:** 0.4 — quotation generation moved into Phase 1
**Purpose:** Design foundation for Phase 1 (sales activity tracking + quotation output).

**Terminology:** "Opportunity" is called **Project** throughout, matching the user's language.

---

## 1. Scope

**Phase 1 delivers:** account and contact management, project tracking with progress and status, tasks, meetings, document storage, manually entered quotation line items capturing both cost and price, and **quotation generation exported to file**.

**Phase 1 does not deliver:** product master, packing/freight calculation, role permissions.

**Team size:** ~5 users. Standalone system, no ERP integration.

---

## 2. Project Model

### 2.1 Two independent fields

A project's state is described by **two separate fields**, not one. This is the key structural decision.

| Field | Purpose | Values |
|---|---|---|
| **Progress %** | How far the project has advanced | 10, 20, 30 … 100 (fixed steps) |
| **Status** | Whether the project is still live | Open / Won / Lost |

**Why both are needed:** progress alone cannot distinguish "lost during negotiation" from "still negotiating" — both sit at 70%. Status carries the outcome; progress carries the position. Reporting uses them together: *lost at what stage* becomes answerable.

Progress is selected from fixed 10% steps — the user cannot type an arbitrary value. Progress may move **backwards** (e.g. re-quoting drops from 70 back to 50). Every change to progress or status is logged with timestamp and user.

### 2.2 Progress ladder

Steps below need label confirmation, but the structure is fixed at 10% increments.

| % | Meaning | Notes |
|---|---|---|
| 10 | Lead received | No qualified information yet |
| 20 | Inquiry captured | Client requirement documented |
| 30 | Spec review | Internal review, supplier request sent |
| 40 | Proposal / spec confirmed | Product and specification agreed internally |
| 50 | Quoted | Quotation issued to client |
| 60 | Client reviewing | Awaiting client response |
| 70 | Negotiation | Price, terms, or lead time under discussion |
| 80 | Final terms agreed | Verbal commitment, PO pending |
| 90 | **Consumable: Won.** Others: PO imminent | |
| 100 | **Consumable: repeat ordering established.** Others: PO received | |

### 2.3 Endpoint by type

- **Consumable** — 90 = Won (first order confirmed). 100 = the client has moved into repeat ordering.
- **Equipment / Part / Service** — 100 = PO received.

### 2.4 Project continues across repeat orders

**Confirmed:** for consumables, repeat business stays within the **same project**. A new project is not created per order.

When a consumable project reaches Won, the system begins generating **recurring follow-up tasks** to chase the next order.

- The **follow-up interval** is set manually by the user on the project (e.g. every 45 days) and can be edited at any time.
- Completing one follow-up task automatically schedules the next, one interval ahead.
- The user can pause or stop the recurrence when the client goes dormant.

### 2.5 Project types

| Type | Endpoint | Special handling |
|---|---|---|
| **Consumable** | 90 Won → 100 Repeat | Recurring follow-up tasks |
| **Equipment** | 100 PO received | — |
| **Part** | 100 PO received | Component of equipment. **Optional link** to the originating equipment project. |
| **Service** | 100 PO received | — |

The Part → Equipment link is optional, not required. It exists so that spare-part history can be traced back to the machine sold, but a Part project can stand alone.

---

## 3. Data Model

### 3.1 Account
- Name, **account type — multi-select** (Client / Supplier / Manufacturer / Service Provider / Logistics)
- Industry, address, country, tax ID
- Payment terms, default currency
- Owner (assigned user)
- Status (active / inactive / prospect)

### 3.2 Person
- Name, position, department
- Account (parent)
- Phone, email, Line/messaging ID
- Primary contact flag
- Role in decision (technical / commercial / decision maker)

### 3.3 Project
- Project name, reference number
- Account (client), primary contact person
- **Type** (consumable / equipment / part / service)
- **Progress %** (10–100, fixed steps)
- **Status** (Open / Won / Lost)
- Lost reason (required when status = Lost)
- Amount, currency
- Expected close date
- Owner (sales engineer)
- Lead source
- **Follow-up interval (days)** — consumable projects, drives recurring task generation
- **Parent equipment project** — optional, Part type only
- Progress/status change history (timestamp, user, from → to)

### 3.4 Quotation

A quotation is a record in its own right, holding the header data that appears on the exported document. A project may have several quotations (revisions or alternative offers).

**Identification**
- Quotation number, revision number
- Issue date, validity period (or valid-until date)
- Status (draft / issued / superseded / accepted / expired)
- Prepared by (user)

**Client block**
- Project, account, contact person
- Billing address, delivery address, tax ID (pulled from account, editable per quotation)

**Commercial terms**
- Selling currency
- Payment terms, delivery terms (Incoterms), lead time
- MOQ note, warranty note (equipment), scope note (service)
- Free-text remarks and terms & conditions

**Totals** (calculated from line items)
- Subtotal
- Discount, if applied at document level
- **VAT 7%** — Thai clients. Must be toggleable for export sales and zero-rated cases.
- Grand total
- Withholding tax note where relevant (service projects)

**Internal-only** (never printed)
- Total cost, total margin, margin %

### 3.4.1 Export

- **Output format: PDF.** The exported file is automatically saved back to the project as a Document of type Quotation, so the sent version is always retrievable.
- The user downloads the PDF and emails it to the client manually. No sending from the system in Phase 1.
- Issuing a revision creates a new quotation record and marks the previous one **superseded**, keeping full history.

**Critical rule: cost and margin must never appear on the exported document.** Because line items now carry unit cost alongside selling price, the export template must explicitly exclude cost, margin, and any internal notes. This is the single highest-risk detail in the feature — a cost column leaking onto a client-facing quotation is a serious commercial problem. The template should be built to print only from an approved field whitelist, not by hiding columns.

### 3.5 Quotation Line Item

Manually entered — no product master in Phase 1. Stored as **structured records** attached to the project, not as free text inside a document.

- Item code (free text, optional)
- Description
- Quantity, unit
- **Unit cost** and cost currency
- Unit selling price
- Line total, line margin (calculated)
- Quotation revision number

**Why cost is captured:** without it, margin can never be reported — not now and not retroactively. Capturing it from day one means Phase 1 data is still useful when the pricing engine arrives.

**Why structure matters:** typed items accumulate into a real dataset. This is what the Phase 2 product master gets designed from, instead of guesswork. The system should offer **autocomplete from previously entered items** to reduce typing and improve consistency.

### 3.6 Task
- Title, description
- Type (call, email, supplier request, internal follow-up, document preparation, site visit)
- Status (open / in progress / done / cancelled)
- Due date, completed date
- Assigned to (user)
- Related project, account, contact person
- **Auto-generated flag** and recurrence link (for order follow-up tasks)

### 3.7 Meeting
- Title, agenda, outcome notes
- Status (planned / completed / cancelled / no-show)
- Date, start time, **duration in hours**
- Location / mode (client site, our office, online, phone)
- Attendees: internal users + contact persons
- Related project

### 3.8 Document
- Document type (Quotation, Proposal, TDS, MOQ, PO, Service Report, Delivery Note, Invoice, Other)
- Uploaded file, version number
- Issue date, issued by
- Related project
- Status (draft / sent / accepted / superseded)

*Documents are uploaded by the user, except quotations, which the system generates and files automatically.*

### 3.9 Relationships

```
Account ──1:N── Person
   │
   └──1:N── Project ──1:N── Task (incl. auto follow-ups)
                 │    ──1:N── Meeting
                 │    ──1:N── Document
                 │    ──1:N── Quotation (revisions) ──1:N── Quotation Line Item
                 │
                 └──0:1── Project (parent equipment, Part type only)

Person ──N:M── Meeting (attendees)
Person ──1:N── Task
```

---

## 4. Key User Stories

**Project handling**
- Create a project from a phone call with only a company name and contact number.
- Set progress by picking a 10% step; move it backwards when a deal regresses.
- Mark status Lost with a required reason, at any progress level.
- Link a Part project back to the equipment project it belongs to.

**Repeat order follow-up**
- Set a follow-up interval on a won consumable project.
- Receive an automatically created task when the interval elapses.
- Complete the task and have the next one scheduled automatically.
- Edit the interval or stop recurrence when the client's ordering pattern changes.

**Quotation**
- Type line items manually with cost and selling price; see margin calculated per line and per quotation.
- Get autocomplete suggestions from items entered previously.
- Enter header terms once — validity, payment terms, lead time, Incoterms — with sensible defaults pulled from the account.
- Toggle VAT on or off depending on whether the sale is domestic or export.
- Export the quotation to PDF and have it filed to the project automatically.
- See margin on screen while building the quotation, and be certain it never appears on the exported file.
- Issue a revision that supersedes the previous version while keeping it retrievable.

**Activity**
- Log a meeting with duration, attendees, and outcome against a project.
- Create tasks with due dates and see a personal dashboard of what's due.
- Upload and retrieve documents by type against a project.

**Visibility**
- Open an account and see every project, contact, meeting, task, and document in one view.
- Open a contact and see every meeting and task involving them.

---

## 5. Reporting Enabled by This Model

- Pipeline value weighted by progress %
- Win/loss rate, and **what stage deals are lost at** (progress + status together)
- Margin per project and per line item
- Activity volume per user — meetings held, meeting hours, tasks completed
- Follow-up compliance on repeat consumable accounts
- Spare-part revenue traced to the equipment that generated it

---

## 6. Remaining Questions

**Q1. Revenue on a continuing project.** Since consumable projects stay open across repeat orders, the single Amount field becomes inaccurate after the second order. Options:
  - (a) Amount = first order only, repeats not valued
  - (b) Amount updated manually to cumulative total
  - (c) A lightweight **Order** record per PO, with amount and date

Option (c) is the only one that supports margin reporting over time, and it is a small addition. Recommend confirming with the user.

**Q2. Progress labels.** Confirm the wording for steps 10–100 in Section 2.2, particularly 40, 60, and 80 which were inferred rather than stated.

**Q3. Follow-up start point.** Does the interval count from the Won date, or from the date of the most recent order?

**Q4. Lost reason codes.** Final list — price, lead time, competitor, client cancelled, declined by us (margin), declined by us (technical), other?

**Q5. Document types.** Confirm the final dropdown list.

**Q6. Platform.** Web only, or is mobile access needed for logging meetings in the field?

---

### Quotation-specific questions

These now block Phase 1 build rather than Phase 2. The single most useful input is **a real recent quotation** — ideally two or three, covering different project types.

**Q7. Template.** Provide an actual quotation file. From it we take: page layout, logo and letterhead, column set, footer, signature block, and standard terms & conditions wording.

**Q8. Language.** Thai, English, or both on the same document? If both are needed, is it a single bilingual layout or two separate templates the user chooses between?

**Q9. Numbering.** Format for quotation numbers (e.g. QT-2026-0001)? Does it reset annually? Is numbering shared across all project types or separate per type?

**Q10. Revisions.** Does a revision keep the same number with a suffix (QT-2026-0001 Rev.2), or take a new number entirely?

**Q11. VAT and tax.** Is VAT 7% always shown for Thai clients? How are export sales handled? Does withholding tax need to appear on service quotations?

**Q12. Do the four project types need different templates?** A service quotation (man-hours, scope of work) and a consumable quotation (items, quantities, MOQ, lead time) may not fit the same layout.

**Q13. Signature.** Is a signed or stamped quotation required, or is an unsigned PDF acceptable? If signing is needed, is a scanned signature image embedded at export?

**Q14. Additional export formats.** Is PDF sufficient, or is an editable format (Word/Excel) also needed for cases where the client requires their own form?
