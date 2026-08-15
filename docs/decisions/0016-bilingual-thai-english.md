# ADR-0016: Bilingual Thai/English — UI everywhere, bilingual data only where it leaves the building

- **Status:** Accepted — narrowed by [ADR-0031](0031-quotation-template-and-numbering.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Domain model
- **Resolves:** Open question Q8

> **Narrowed 2026-08-11.** The samples show bilingual means **fixed labels in Thai + English, with entered content in English**. So **no bilingual data fields are needed** — `name_th`/`name_en` pairs are dropped everywhere except `Company`, which prints its own name and address in both. The Thai *rendering* requirements below are unchanged and remain critical: font embedding, correct shaping, and line breaking that does not split Thai words (see `libthai` in [ADR-0035](0035-tech-stack-django-weasyprint.md)).

## Context

KK confirmed the app must be **bilingual** (Thai and English).

"Bilingual" hides two very different requirements. **UI language** is interface labels, buttons, menus, and report headings — a solved problem with standard i18n. **Bilingual data** means storing two versions of user-entered content, which doubles data entry for every field it touches and is a permanent tax on the people using the system.

Deciding which fields need bilingual *storage* is the real design question here, and it is one that is painful to change later in either direction.

## Options considered

1. **UI only, single-language data.**
   - Pro: cheapest; no double entry.
   - Con: fails on the documents that leave the company. A quotation to a Japanese principal's customer needs English product names; a quotation to a Thai factory needs Thai. One stored name cannot serve both.

2. **Everything bilingual** — every text field has a Thai and an English version.
   - Pro: uniform rule, no judgement calls.
   - Con: doubles entry on notes, meeting outcomes, and internal comments that nobody will ever read in the other language. In practice the second field goes empty or gets a copy-paste of the first, so the model carries cost without benefit.

3. **UI bilingual; data bilingual only for content that appears on customer-facing output.**
   - Pro: pays the double-entry cost exactly where it buys something.
   - Con: requires deciding the boundary, and the boundary may move.

## Decision

Option 3.

**UI language** — per-user preference, Thai or English, switchable at any time. Standard resource-file i18n. All labels, navigation, validation messages, and built-in report headings translated.

**Bilingual data fields** — only where content reaches a customer:

| Entity | Bilingual fields |
|---|---|
| `Product` | `name_th`, `name_en` — these print on quotations |
| Quotation terms / boilerplate | Payment, delivery, warranty text — maintained as bilingual snippets |
| Document type names, product categories, units | Small controlled vocabularies that appear on output |

**Single-language free text everywhere else** — account names, contact names, opportunity names, notes, meeting outcomes, expense notes, document titles. Users type whatever language they think in, and the system does not care.

**Quotation language is chosen per quotation.** The document renders entirely in that language, pulling the matching product names and boilerplate. If the chosen language's value is missing, fall back to the other rather than printing a blank — a quotation with an English name on a Thai document is recoverable; a blank line is not.

**Thai must work properly**, not merely display: correct fonts in PDF output (Thai renders badly with careless font handling), Thai-aware sorting, and search that does not break on Thai word boundaries.

## Rationale

The boundary "does this text leave the building?" is the one that predicts whether the second language is worth entering. A product name on a quotation is read by a customer who may not read Thai. A note about a phone call is read by the SE who wrote it and possibly their manager, both of whom are bilingual. Paying double-entry cost on the second category buys nothing.

The uniform-bilingual option fails in practice rather than in theory: when a field's second language has no reader, it is left empty or filled with a copy of the first, and the schema ends up carrying a cost with no corresponding benefit. Better to decide the boundary deliberately and move it later if needed — adding a bilingual field to one entity is a small migration; removing dozens of unused ones is a bigger mess.

Thai rendering in PDF deserves the explicit call-out because it is a classic late-discovered failure. Thai has no spaces between words, uses stacked diacritics, and breaks badly under font substitution — a PDF library that handles English fine can produce garbled or clipped Thai. This needs testing in the first week of building the quotation output, not the last.

## Consequences

- The quotation PDF renderer must be chosen with Thai support as a hard requirement, and verified with real Thai text early.
- Product entry now needs two names ([ADR-0014](0014-product-catalogue-in-phase-1.md)). Falling back rather than blanking keeps this from blocking anyone.
- Quotation boilerplate becomes a small managed content area, not hard-coded strings.
- Search must handle Thai. A naive tokeniser will fail; this needs checking against the chosen database's Thai capability.
- Date and number formatting follow UI language; Buddhist-era vs. Gregorian year on customer-facing Thai documents is an open question (Q13) — Thai business documents often use B.E.
- Every future feature carries a small i18n obligation. Cheap if the framework is set up correctly from the first screen, expensive if retrofitted.

## Revisit when

A customer segment needs a third language, or if bilingual product names prove to be routinely left half-filled — which would mean the boundary is drawn in the wrong place.
