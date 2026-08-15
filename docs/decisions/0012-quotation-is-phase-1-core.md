# ADR-0012: Quotation is a Phase 1 core feature

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept
- **Amends:** [ADR-0010](0010-document-model.md) (which deferred quotation to Phase 2)

## Context

[ADR-0010](0010-document-model.md) modelled `Quotation` as its own entity but deferred it to Phase 2, on the grounds that doing it properly means commercial terms, tax, numbering, and approval — and that Phase 1's `OpportunityLineItem` would capture the underlying data in the meantime.

That record explicitly flagged this as the weakest point in the Phase 1 story. KK has now confirmed it is worse than weak: *"the quotation must be able to be created and collected in the CRM, this is their default requirement."*

This is the baseline expectation, not a stretch goal. A CRM that cannot produce a quotation would not be adopted by a sales engineer team, because producing quotations is a large part of what they do all day.

## Options considered

1. **Keep quotation in Phase 2.** Rejected outright — it contradicts a stated default requirement. Phase 1 would ship without the feature that justifies the tool.
2. **Full quotation in Phase 1** — creation, revisions, terms, tax, PDF, *and* the discount-approval workflow.
   - Pro: complete on day one.
   - Con: approval workflow is process, not document. It carries routing, notification, and state-machine complexity, and at under 10 users an approval step can be a conversation.
3. **Quotation document in Phase 1, approval workflow in Phase 2.**
   - Pro: the SE gets the thing they actually need — build a quote, revise it, send a PDF, keep the history. Cuts the heaviest part.
   - Con: discount control stays informal for the first release.

## Decision

Option 3. `Quotation` is a Phase 1 core entity.

**In Phase 1:** quotation number (configurable format, auto-assigned), revision chain, linked opportunity/account/contact, issue date, validity date, currency and language ([ADR-0015](0015-multi-currency.md), [ADR-0016](0016-bilingual-thai-english.md)), line items drawn from the product catalogue ([ADR-0014](0014-product-catalogue-in-phase-1.md)) or entered free-text, subtotal / discount / VAT / total, terms (payment, delivery, warranty), status, and PDF export.

**Status lifecycle:** `Draft → Sent → Accepted | Rejected | Expired`, plus `Superseded` when a later revision replaces it.

**Revisions are immutable.** Issuing revision 2 supersedes revision 1; revision 1 stays retrievable exactly as sent. A quotation that went to a customer is evidence.

**Deferred to Phase 2:** discount approval workflow, approval thresholds, e-signature, and automatic reminders on expiring quotations.

**Relationship to the opportunity:** the accepted quotation's total becomes the opportunity value. Before a quotation exists, the value is the SE's estimate from line items.

## Rationale

Quotation is the point where the CRM stops being a tracking tool and starts doing work for the SE. Everything else in Phase 1 asks them to record what they did; this one produces something they would otherwise have spent an hour on in Excel. Under [ADR-0001](0001-build-for-the-sales-engineer-first.md)'s test — does the feature earn its place by helping the SE — quotation scores higher than anything else in the product.

It is also the entity that makes the rest of the data trustworthy. If quotes are built in the CRM, the line items, product codes, currencies, and deal values are correct as a by-product. If quotes are built in Excel, all of that is duplicate data entry and will rot exactly as [ADR-0001](0001-build-for-the-sales-engineer-first.md) predicted.

Splitting off the approval workflow is the right cut because it is the only genuinely *process*-shaped part. Everything else is document construction, which is well-understood and testable. At this team size, a manager approving a discount by walking over is not a product failure.

## Consequences

- **Phase 1 is now substantially larger.** Quotation with revisions, tax, and PDF output is one of the biggest items in the release. See [ADR-0020](0020-phase-1-scope-reassessment.md) for how the scope was rebalanced to absorb it.
- Quotation numbering needs a format decision (prefix, year, sequence, revision suffix) and must be gap-free enough to satisfy whoever does the books.
- VAT handling is required in Phase 1. Thai VAT is 7%, but the rules around inclusive/exclusive pricing and withholding tax need confirming — see open question Q12.
- PDF output quality matters a great deal: this document represents VCS to its customers, and it must render in Thai and English ([ADR-0016](0016-bilingual-thai-english.md)).
- The product catalogue becomes a hard dependency, not an optional one ([ADR-0014](0014-product-catalogue-in-phase-1.md)) — quoting from free text only would defeat the purpose.
- Multi-currency becomes a hard dependency too ([ADR-0015](0015-multi-currency.md)): a quotation must state one currency and be arithmetically correct in it.

## Revisit when

Phase 2, for the approval workflow — or sooner if discounting turns out to need control before then.
