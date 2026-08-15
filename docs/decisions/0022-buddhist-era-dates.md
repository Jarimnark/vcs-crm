# ADR-0022: Buddhist era on Thai output, Gregorian storage everywhere

- **Status:** ⚠️ Superseded by [ADR-0031](0031-quotation-template-and-numbering.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Resolves:** Open question Q13

> **Superseded 2026-08-11.** Both live quotation samples show **2026 — Christian era**. KK confirmed the samples win over the earlier instruction. See [ADR-0031](0031-quotation-template-and-numbering.md). The **Gregorian ISO storage** half of this record survives and still matters; what is removed is the B.E. conversion layer, B.E. date pickers, and import-side B.E. detection. A worked example of sound reasoning reaching the wrong answer from inference.

## Context

Q13 asked whether Thai-language customer documents should carry Buddhist era (พ.ศ.) or Gregorian years. KK: **Buddhist era.**

This is expected — Thai business and legal documents conventionally use B.E. The design question is not *whether* to display it but *where the conversion happens*, and that is a decision with a long tail of consequences if taken carelessly.

## Options considered

1. **Store dates in Buddhist era.**
   - Pro: no conversion when rendering Thai documents.
   - Con: every date comparison, sort, database function, third-party library, and import file would need to know it is looking at B.E. Any code path that misses it is off by 543 years — an error large enough to be obvious once found and easy to miss until then. Date arithmetic across an import boundary becomes a permanent hazard.

2. **Store Gregorian (ISO 8601), convert only at render time.**
   - Pro: the entire system — database, queries, sorting, exports, libraries — works in one universal representation. Conversion is a display concern handled in one formatting layer.
   - Con: the formatting layer must be applied consistently; a missed call renders A.D. on a Thai document.

3. **Store both.** Rejected — two representations of the same fact that can drift apart, for no benefit over option 2.

## Decision

**All dates are stored as Gregorian ISO 8601 (`YYYY-MM-DD`), in UTC where a time component exists.** No Buddhist-era value is ever persisted.

**Conversion happens at render time only**, through a single shared date-formatting function. Nothing formats a date by hand.

**Display rules:**

| Context | Format |
|---|---|
| Thai-language customer documents (quotation PDF) | Buddhist era — e.g. `29 กรกฎาคม 2569` |
| English-language customer documents | Gregorian — e.g. `29 July 2026` |
| Internal UI, Thai language setting | Buddhist era |
| Internal UI, English language setting | Gregorian |
| Data exports (CSV), API, filenames, logs | **Always Gregorian ISO** — machine-readable, never localised |

B.E. = A.D. + 543.

**Imported data is assumed Gregorian unless a column is explicitly marked B.E.** Source spreadsheets ([ADR-0019](0019-historical-data-import.md)) will contain both, sometimes in the same file. The import dry-run should flag any year that looks like B.E. (roughly, > 2400) rather than silently accepting a date 543 years in the future.

## Rationale

Storing B.E. would spread a Thailand-specific convention through every layer of a system that otherwise has no opinion about calendars. Databases, date libraries, sorting, and every future integration all assume Gregorian. Fighting that assumption in a hundred places to save one formatting call is a poor trade, and the failure mode — a silent 543-year error — is exactly the kind that survives testing and shows up on a customer document.

Keeping exports Gregorian matters more than it looks. A CSV opened in Excel with B.E. years either fails to parse as dates or parses as far-future Gregorian ones. Machine-readable output should never be localised.

The import-side B.E. detection is worth building because the source data is informal and someone will certainly have typed 2569 in a year column. Catching it at dry-run is cheap; finding it later in a report is not.

## Consequences

- One shared date-formatting utility, aware of the current language context. Every date in the UI and every date on a PDF goes through it.
- Thai month names must be correct and complete — this is part of the i18n resource set ([ADR-0016](0016-bilingual-thai-english.md)), not a hard-coded array.
- Quotation validity periods are computed in Gregorian and displayed in B.E. There is no arithmetic in B.E. anywhere.
- Import dry-run gains a B.E.-detection warning.
- Date pickers under the Thai UI should show B.E. years, or users will second-guess what they are entering. This is a real UI cost and is easy to overlook.
- Anyone reading the database directly sees Gregorian. Worth stating in the eventual technical documentation so it is never a surprise.

## Revisit when

Not expected to change. If VCS ever needs a fiscal calendar distinct from the civil one, that is a separate concern and does not affect this decision.
