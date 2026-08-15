# ADR-0013: Documents are collected files with metadata, not authored records

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Supersedes:** the `Document` portion of [ADR-0010](0010-document-model.md), and by extension [ADR-0002](0002-engineering-report-as-first-class-entity.md)

## Context

[ADR-0002](0002-engineering-report-as-first-class-entity.md) and then [ADR-0010](0010-document-model.md) argued that technical reports should be *authored inside* the CRM: a template defining typed fields, filled in on a phone at the site, with photos, exported to PDF. The claimed benefit was reuse, field-level structure, and countability.

KK has now given the actual requirement: *"other report can collect as the document, no need to write a specific field in DB."*

That is a different product. VCS already writes these reports — in Word, in Excel, on the principal's own form. What is missing is not an authoring tool; it is a place where the finished document reliably sits against the right deal, findable a year later. The earlier records solved a problem VCS did not have, and priced it as if it were the differentiator.

## Options considered

1. **Templated authoring** — as designed in ADR-0002/0010.
   - Pro: structured field data; report written once, on the phone.
   - Con: requires a field-definition model, a form renderer, a PDF layout engine, and a template per type. Substantial build. Worse, it competes with tools the SEs already know and forces them to rebuild forms that often come from the principal and cannot be changed.

2. **Collected files with structured metadata** — the document is a file; the CRM owns type, title, date, relationships, and status.
   - Pro: near-zero build cost. Works for *every* document type immediately, including ones we have never seen and principal-issued forms we could not template anyway. SEs keep using tools they know.
   - Con: no field-level data, so reporting is limited to counts and dates. No phone-based authoring.

3. **Hybrid** — templates for one or two high-value types, files for everything else.
   - Pro: structure where it pays.
   - Con: builds the whole template engine for one or two types. The build cost is in the engine, not the templates, so this saves almost nothing over option 1.

## Decision

Option 2. One `Document` entity:

| Field | Notes |
|---|---|
| `type` | Configurable list: Site Survey, Test Report, Service Report, Engineering Document, Drawing, Principal Quotation, Customer Spec, Purchase Order, Other |
| `title` | Free text |
| `document_date` | The date on the document, not the upload date |
| `opportunity_id` / `account_id` | Either or both; a document can belong to an account without a deal |
| `uploaded_by`, `uploaded_at` | |
| `status` | `Draft` / `Issued` / `Superseded` |
| `language` | Thai / English / both ([ADR-0016](0016-bilingual-thai-english.md)) |
| `notes` | Free text |
| `files` | One or more attached files, versioned |

This replaces both the templated `Document` *and* the separate `Attachment` entity from [ADR-0010](0010-document-model.md) — there is no longer a meaningful difference between them, so they collapse into one.

`DocumentTemplate` is **not built**.

**`Quotation` is the exception** and remains a fully authored entity ([ADR-0012](0012-quotation-is-phase-1-core.md)). It is the one document the CRM generates rather than collects.

## Rationale

The honest reading is that ADR-0002 mistook a plausible differentiator for a real requirement. It reasoned from "a generic CRM cannot do this" to "VCS needs this", which does not follow. VCS's actual pain is that finished documents are scattered, not that they are hard to write.

Collecting also covers a case templating never could: many of these forms originate with the principal or the customer and their layout is not VCS's to change. A template engine would handle the documents VCS controls and fail on the rest — so the CRM would need file collection anyway, and would then have two mechanisms for the same job.

The cost is real and should be stated plainly: **counting and correlation survive, field-level analysis does not.** We can still answer "how many site surveys did we do, on which deals, and what did they convert at" — which was the question that actually mattered. We cannot answer questions about what was *inside* the reports. That is an acceptable trade for removing what would have been one of the largest items in the build, especially now that Phase 1 has absorbed quotation, product catalogue, multi-currency, and bilingual support.

## Consequences

- The mobile site-survey authoring flow is **cancelled**. Field capture in Phase 1 is: log the visit, write outcome notes, attach photos, record expenses. The formal report is uploaded later from a laptop.
- The product's differentiation now rests on quotation, the product catalogue, expense capture, and equipment-sales-shaped pipeline — not on report authoring. This is a fair trade but it should be said out loud, because it changes what "why not just buy a CRM?" is answered with.
- File storage, size limits, preview, and full-text search of attachments become more important, since documents are now the primary carrier of technical content. Search across document titles and types must be good.
- The document `type` list must be manager-configurable, since VCS clearly has a long tail.
- If field-level data on one document type later proves genuinely valuable, that type can be promoted to an authored entity — the same way `Quotation` is. Doing it once for a proven need beats building an engine for a hypothetical one.

## Revisit when

A specific document type demonstrably needs queryable field data — for example, if service reports become the basis for a maintenance-contract business. Promote that one type; do not rebuild the engine.
