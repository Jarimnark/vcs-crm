# ADR-0018: No ERP exists — invoices stay manual references, and the finance boundary is re-examined

- **Status:** Accepted — invoice scope further reduced, see below
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Integration
- **Amends:** [ADR-0007](0007-crm-is-not-the-financial-source-of-truth.md)
- **Resolves:** Open question Q6

> **Amended 2026-07-29.** KK: *"let's avoid invoice at first, confirm later."* `InvoiceRef` is therefore **not scheduled at all** — it is dropped from Phase 2 and parked entirely, pending a decision on Q14. Everything else in this record stands: the CRM does not issue invoices, and there is no ERP to integrate with. The consequence is that Phase 3's "actuals" have no source in the system until this is revisited.

## Context

[ADR-0007](0007-crm-is-not-the-financial-source-of-truth.md) established that the CRM is not the financial source of truth: an accounting or ERP system owns invoices, payments, and recognised revenue, and Phase 3 would read actuals from it.

KK has now answered Q6: **"no ERP system, just manually now."**

This weakens the premise ADR-0007 rested on. That record assumed an authoritative system existed and the risk was the CRM disagreeing with it. If invoicing is manual — spreadsheets, a template, an external accountant — then there is no system to disagree with, and the argument has to be re-made rather than re-applied.

## Options considered

1. **Treat the conclusion as unchanged.** Reference-only invoices, no integration, wait for an ERP.
   - Pro: no scope change; ADR-0007's principle survives intact.
   - Con: leaves the CEO's Phase 3 view with no actuals at all, since there is nothing to read from.

2. **The CRM becomes the invoicing system.** Issue tax invoices, receipts, and track payment.
   - Pro: fills a genuine gap; with quotation already in Phase 1 ([ADR-0012](0012-quotation-is-phase-1-core.md)), quotation-to-invoice is a short step.
   - Con: Thai tax invoices carry statutory requirements — mandatory fields, gap-free sequential numbering, VAT and withholding tax handling, credit notes, retention rules. Getting these wrong is a compliance problem, not a bug. It also pulls a finance role into a tool built for sales engineers, breaking [ADR-0001](0001-build-for-the-sales-engineer-first.md).

3. **Manual invoice references now; revisit invoicing as a deliberate future decision.**
   - Pro: gives the SE billing visibility on the deal immediately, at trivial cost. Keeps the compliance surface out of Phase 1.
   - Con: someone re-types the invoice number and amount. Acceptable at VCS's volume.

## Decision

Option 3, with the boundary restated rather than assumed.

**`InvoiceRef` stays reference-only** and moves to **Phase 2**: invoice number, invoice date, amount and currency, payment status, due date, optional attached PDF, linked to the opportunity. Entered by hand.

**The CRM does not issue invoices, does not allocate invoice numbers, and does not compute tax for invoicing purposes.** Quotation VAT ([ADR-0012](0012-quotation-is-phase-1-core.md)) is a commercial estimate on a commercial document, not a tax computation.

**ADR-0007's principle is retained but re-grounded.** The original justification — "the accounts will contradict us" — no longer holds as stated. The decision survives on a different and, if anything, stronger basis: whatever produces VCS's invoices today is what the company's books and tax filings are built on, and duplicating that inside a sales tool creates a second set of numbers with no reconciliation mechanism and real statutory exposure.

**Phase 3 finance integration is downgraded from "integration" to "manual entry plus import".** Actuals arrive by hand or by spreadsheet import, not by API.

**Whether VCS eventually wants the CRM to issue invoices is now an open question (Q14), not a settled no.** With no ERP and quotation already in the system, it is a legitimate future direction — but it is a separate product decision with compliance consequences, and it needs its own record.

## Rationale

The honest position is that ADR-0007 reached a defensible conclusion via an assumption that turned out to be wrong. Rather than quietly keep the conclusion, the reasoning is rebuilt here.

The rebuilt argument is about statutory risk and focus, not about system conflict. Thai tax invoicing has real rules — sequential numbering without gaps, mandatory content, retention periods, credit-note handling. An internal tool built by a small team for sales engineers is a poor place to take on that surface, and the consequence of an error is not a wrong dashboard but a filing problem.

Reference-only still delivers the useful part. An SE asked "has this been invoiced?" can answer without leaving the CRM, and Phase 3 gets an actuals figure — manually maintained, but real. Deferring to Phase 2 keeps an already-enlarged Phase 1 ([ADR-0020](0020-phase-1-scope-reassessment.md)) from growing further.

Leaving Q14 genuinely open matters. The absence of an ERP is a real gap, and "the CRM should grow into it" is a reasonable thing for VCS to conclude later. What would be wrong is drifting into invoicing feature by feature without ever deciding.

## Consequences

- Phase 3's "finance integration" is renamed and rescoped: **manual actuals entry and spreadsheet import**, no API work.
- Invoice amounts in the CRM are manually maintained and may be incomplete or stale. Every report using them must label them as such — an invoice-based revenue figure is not an audited figure.
- Without an ERP, the CRM will become the closest thing VCS has to a structured commercial record. Expect pressure to extend it toward finance. That pressure should surface as Q14 being decided, not as scope creep.
- Backup and retention now matter more than they would beside an ERP, because for pipeline, quotation, and product data there is no second copy anywhere. This belongs in the infrastructure design.
- If VCS adopts an ERP later, `InvoiceRef` is the natural integration seam and should be designed so a sync can populate it without a rewrite.

## Revisit when

VCS adopts an accounting or ERP system, or when Q14 is decided. Also revisit if manual invoice-reference entry proves unreliable enough that Phase 3's revenue figures cannot be trusted.
