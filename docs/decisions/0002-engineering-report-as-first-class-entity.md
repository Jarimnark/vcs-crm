# ADR-0002: Engineering reports are a first-class entity, not attachments

- **Status:** ⚠️ Superseded by [ADR-0010](0010-document-model.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept

> **Superseded 2026-07-29, then reversed the same day.** First [ADR-0010](0010-document-model.md) generalised the single `EngineeringReport` into a templated `Document` entity. Then [ADR-0013](0013-documents-are-collected-not-authored.md) reversed the central claim of *this* record outright: VCS does not need report authoring in the CRM, only reliable collection of reports written elsewhere. Documents are files with metadata; no template engine is built.
>
> This record is kept because the reversal is instructive. It reasoned from "a generic CRM cannot do this" to "VCS needs this", which does not follow — a plausible differentiator was mistaken for a stated requirement. The one part that survived is that `Quotation` genuinely is authored in the system ([ADR-0012](0012-quotation-is-phase-1-core.md)).

## Context

A VCS sales engineer produces technical documents as a core part of selling: site surveys, technical studies, spec comparisons, proposal summaries, and commissioning reports. In a generic CRM these would be Word or PDF files uploaded as attachments to a deal.

VCS's stated requirement is that the web app covers "sales *and* engineering report" work. That phrasing is the reason this decision exists — the engineering artefact is not incidental to the sale, it *is* a large share of the SE's work.

## Options considered

1. **Attachments only** — the SE writes the report in Word, uploads the PDF.
   - Pro: zero build cost; total flexibility of format.
   - Con: content is opaque to the system. Cannot count, search, template, or analyse. The SE still does the writing in a separate tool, so the CRM saves them nothing on their most time-consuming task. Photos from a site visit end up in a phone gallery, not in the record.

2. **First-class structured entity** — `EngineeringReport` with a template, typed fields, photo slots, status, and PDF export.
   - Pro: fills itself from opportunity and account data; reusable as a starting point for the next similar job; countable and analysable ("site surveys done last quarter → conversion rate"); photos land in the right place from the field; the SE writes it once, from their phone, at the site.
   - Con: real build cost. Template design requires knowing what VCS's actual reports contain. Risk of a rigid form that doesn't fit an unusual job.

3. **Free-text rich note per report type** — a middle path with a title, type, and a rich text body.
   - Pro: cheap; some structure for counting and filtering.
   - Con: still nothing reusable inside the body; no photo structure; only marginally better than attachments for the SE.

## Decision

`EngineeringReport` is a first-class entity in the domain model, with templates, typed fields, photo attachments, a status, and PDF export. Phase 1 ships at least two templates: **Site Survey** and **Technical Proposal Summary**.

Every template must include a free-text "additional notes" section, so an unusual job is never blocked by the form.

## Rationale

This is the single feature that makes VCS CRM worth building instead of buying an off-the-shelf CRM. A generic CRM handles accounts, opportunities and tasks perfectly well; none of them understand that a site survey is a countable business event that predicts a win.

It also aligns with ADR-0001: it is the clearest case of a feature that serves the SE directly *and* produces management-grade data as a by-product. The SE saves an hour of report writing; the business gets a structured record of engineering effort per deal. Nobody is doing data entry for someone else's benefit.

## Consequences

- Template design is a blocking dependency on Phase 1 — we need real examples of reports VCS writes today (open question Q3).
- Mobile support becomes essential rather than nice-to-have: a site survey written at the site is the whole point.
- Photo storage and handling must be designed properly (size, orientation, offline capture) — this has infrastructure implications.
- PDF export quality matters, because these documents go to customers and represent VCS.
- We accept the risk of over-structuring; the free-text section is the escape hatch, and template v1 should err toward fewer fields.

## Revisit when

After one quarter of use, check whether SEs are using the structured fields or dumping everything into the free-text section. Heavy free-text use means the template is wrong and needs redesign with real users.
