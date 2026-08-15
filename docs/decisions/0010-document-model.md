# ADR-0010: Templated Document entity, Quotation separate, Invoice by reference

- **Status:** ⚠️ Partially superseded — see below
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Supersedes:** [ADR-0002](0002-engineering-report-as-first-class-entity.md)

> **Amended 2026-07-29.** This record made three decisions; two changed within the day.
>
> | Part | Now |
> |---|---|
> | Templated `Document` with typed fields | ❌ **Superseded by [ADR-0013](0013-documents-are-collected-not-authored.md)** — documents are collected files with metadata; no template engine is built |
> | `Quotation` as a separate entity | ✅ **Holds**, but promoted from Phase 2 to Phase 1 by [ADR-0012](0012-quotation-is-phase-1-core.md) |
> | `InvoiceRef`, reference only | ✅ **Holds**; re-grounded by [ADR-0018](0018-no-erp-invoice-boundary.md) now that we know no ERP exists |
>
> The reasoning for splitting quotation from other documents is the part of this record still worth reading.

## Context

ADR-0002 established that engineering reports are a first-class, templated entity rather than file attachments. That decision holds — but it was written assuming one or two report types.

KK has since described the real picture: SEs work with **test reports, service reports, engineering documents, quotations, and invoices** — and noted that invoices may involve roles beyond the SE team. So the question is no longer "should reports be structured", it is "how many entities does this family of documents need, and where does the CRM stop".

These five do not behave alike:

- *Test report, service report, engineering document, site survey* — technical output. Templated fields, photos, a customer-facing PDF. Produced by the SE.
- *Quotation* — commercial. Carries priced line items, revisions, a validity date, and eventually an approval step. It is the document that sets the deal value.
- *Invoice* — financial. Belongs to the accounting system, which per [ADR-0007](0007-crm-is-not-the-financial-source-of-truth.md) owns money.

## Options considered

1. **One `Document` entity for all five**, with a `type` discriminator.
   - Pro: uniform, simplest to build, any new document type is configuration.
   - Con: quotation's priced line items and revision chain have to be bolted onto a generic shape — either as untyped JSON (unqueryable, so no "margin by quotation") or as nullable columns only one type uses. Invoices would sit inside the CRM as if the CRM owned them, contradicting ADR-0007.

2. **`Document` (templated, generic) + `Quotation` (its own entity) + `InvoiceRef` (a pointer).**
   - Pro: each shape gets the model it needs. Technical documents stay fully configurable; quotation gets real line items and real revisions; invoices stay in the accounting system where they belong.
   - Con: three things to build instead of one.

3. **A separate entity per document type** — `TestReport`, `ServiceReport`, `Quotation`, and so on.
   - Pro: most precise.
   - Con: every new document type is a schema change, a migration, and a release. VCS clearly has many types and will discover more.

## Decision

Option 2.

**`Document`** — one generic, templated entity for all technical output. Type is driven by a `DocumentTemplate` record that defines the fields, so adding "Commissioning Report" is configuration, not code. Carries: type, template, status (`Draft → Issued → Superseded`), typed field values, photos, free-text notes, related opportunity/account, author, version, and PDF export.

Phase 1 ships templates for **Site Survey** and **Test Report**. Service report and engineering document follow once we have real examples of each.

Every template keeps a free-text section, so an unusual job is never blocked by the form (carried over from ADR-0002).

**`Quotation`** — its own entity, with `QuotationLineItem`, revision number, validity date, status, and terms. Deferred to **Phase 2**: doing it properly means commercial terms, tax handling, numbering rules, and approval. Phase 1's `OpportunityLineItem` is the data foundation it will build on, so nothing has to be re-entered when it arrives.

**`InvoiceRef`** — reference only. Stores invoice number, date, amount, and payment status against an opportunity, so an SE can answer "has this been billed?" without leaving the CRM. The CRM never issues an invoice, never numbers one, and never treats its own copy as authoritative. Manual entry in **Phase 2**; automatic sync from the accounting system in **Phase 3**.

## Rationale

The split follows the lifecycles, not the file formats. What makes a quotation different from a test report is not that it looks different — it is that it has priced line items that roll into the deal value, and a revision chain where "v3 supersedes v2" carries commercial meaning. Forcing that into a generic document shape means either giving up querying it (JSON blob) or polluting the generic shape with columns only one type uses. Both are worse than a second entity.

Making technical documents template-driven rather than per-type is the opposite trade, for the opposite reason: those types differ only in *which fields they show*. That is exactly what configuration is for, and VCS clearly has a long tail of them.

Invoices are the clearest case. KK's note that invoices "may be for other roles too" is the early signal of a scope expansion — invoicing pulls in tax rules, credit notes, numbering sequences, and a finance role, and lands the CRM in permanent disagreement with the accounts. Reference-only keeps the useful part (an SE can see billing status on the deal) at almost no cost, and keeps ADR-0007 intact.

## Consequences

- `DocumentTemplate` needs a field-definition model (field name, type, required, order, section). This is the main new build cost and should be kept deliberately modest: text, number, date, select, checkbox, photo. Not a form builder.
- Template design is blocked on real examples. Site survey and test report are needed before Phase 1 build; service report and engineering document can follow.
- Documents are versioned, not edited in place once issued — a report sent to a customer must stay retrievable as sent.
- Because a document's fields are template-defined, cross-document reporting is limited to metadata (type, count, status, date, related deal), not field values. Acceptable: "how many site surveys, and what did they convert at" is the question that matters, not "average measured pressure".
- Quotation being Phase 2 means SEs keep producing quotes outside the CRM for the first release. Accepted, but it is the weakest point in the Phase 1 story and should be the first Phase 2 item.
- `InvoiceRef` needs a reconciliation story in Phase 3 — what happens when the CRM's copy and the accounting system disagree. The accounting system wins; the CRM shows the discrepancy rather than hiding it.

## Revisit when

Phase 2 begins (quotation build), or if a technical document type turns out to need queryable field-level reporting — which would mean promoting it out of the generic `Document` shape.
