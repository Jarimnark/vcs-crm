# ADR-0031: Quotation template, numbering, and dates — from the live samples

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** Client, via `quotation-template-spec.md` and `phase1-design-handoff.md` Part A
- **Phase:** Domain model / Product
- **Supersedes:** [ADR-0022](0022-buddhist-era-dates.md), [ADR-0023](0023-quotation-belongs-to-an-opportunity.md)

## Context

Two real quotations — QUO69054 (consumable, DELO DUALBOND AD4950) and QUO69041 (equipment, DELO-ACTIVIS 330 kit) — answered questions this log had been guessing at. [ADR-0022](0022-buddhist-era-dates.md) and [ADR-0023](0023-quotation-belongs-to-an-opportunity.md) were both reasoned from inference; the samples contradict both.

This is the payoff from the request that had been outstanding since the first version of the concept: *get a real quotation.* It resolved five open questions at once and overturned two decisions.

## Decision

### Dates — Christian era

Both samples show 2026. **Christian era on all output**, Gregorian storage, no conversion layer.

[ADR-0022](0022-buddhist-era-dates.md) chose Buddhist era on KK's direct instruction, reasoning that Thai commercial documents conventionally use B.E. The samples show VCS does not. KK confirmed the samples win.

The storage half of ADR-0022 survives and still matters: **dates are stored as Gregorian ISO 8601, formatted at render.** What is removed is the B.E. conversion, the B.E.-aware date pickers, and the import-side B.E. detection — a meaningful simplification.

**Date format must be enforced.** The samples are inconsistent — `15-07-26` in one, `7 May 2026` in the other. `15-07-26` is ambiguous three ways. One format, applied everywhere: `DD/MM/YYYY` or an unambiguous long form.

### Numbering — global sequential

**Format `QUO#####`**, five digits, one continuous counter. Sample numbers 69041 and 69054 indicate a long-running global sequence with no annual reset and no per-type separation.

This supersedes [ADR-0023](0023-quotation-belongs-to-an-opportunity.md), which derived the quotation number from a project code. That decision was made on KK's instruction that "quotation must relate to opportunity" — the *relationship* requirement stands and is enforced by a mandatory foreign key, but it is not expressed in the number.

**The mandatory link survives, and it is the part worth keeping.** [ADR-0023](0023-quotation-belongs-to-an-opportunity.md)'s substantive argument was that optional links produce orphaned quotations and an under-reported pipeline. `Quotation.project` remains non-nullable.

The counter must **continue from the existing sequence**, not restart — VCS's numbering is already in the high 69000s and clients recognise it.

**Revision numbering is unresolved** (client D6/Q6): suffix (`QUO69054-R2`) or a new number entirely. Suffix is recommended — it keeps a revision visibly the same offer.

### Template — one bilingual layout

**Both project types use the same template.** No separate service or equipment layouts. This removes the client's earlier Q12.

**Bilingual means fixed labels in Thai + English, entered content in English.** This narrows [ADR-0016](0016-bilingual-thai-english.md) considerably: the labels are template constants, so **no bilingual data fields are needed anywhere**. `name_th`/`name_en` pairs are dropped except on `Company`, which prints its own name and address in both.

**Six blocks:** header (logo, company name/address/tel, red ใบเสนอราคา / QUOTATION box) · client box + attention box · header bar (No. / Date / Validity / Delivery / Payment / Salesperson) · line item table · terms block · footer (thank-you text + Total / VAT 7% / Grand Total).

**Unsigned PDF is acceptable.** Neither sample shows a signature block, bank details, or terms-and-conditions section.

### Terms live on the quotation, not the line

Currency, Incoterm, payment term, lead time, and country of origin describe the whole offer. Both samples print them inside line 1's description cell — an artefact of single-line quotations, not a model requirement. Stored as quotation header fields, printed once below the table.

**Confirmed by the client** (their D2/A1). Flagged as untested: both samples have one line item, so a quotation mixing three origins with three lead times has never been seen.

### "See below" is a bug to fix, not a value to store

Validity, delivery date, and payment term in the samples read "See below", with the real content pushed into the description cell. That is a workaround for a header bar with no room for long values.

**The system prints the value in the bar when it fits, and "See below" automatically when it does not**, rendering the full text into the terms block. The user never types "See below".

### Multi-page behaviour

| Block | Every page | Last page only |
|---|---|---|
| Logo, company name, address, tel | ● | |
| Quotation title box | ● | |
| Line table column headings | ● | |
| `Page x/y` | ● | |
| Terms block, thank-you text, totals | | ● |

- A line item **does not split across pages** — if it will not fit, it moves whole.
- A line taller than a full page **may** break, description continuing.
- Terms block, thank-you text, and totals **travel together**. Totals must never appear without at least the terms block above them.
- **Continuous totals** — last page only, no carried-forward subtotals (client A3 recommendation (a)).
- Client box and attention box on **page 1 only**; quotation number repeats on every page so a detached page is identifiable. *Client question D1, recommendation adopted pending confirmation.*

### The cost-leak rule

Line items carry `unit_cost`, `cost_currency`, and derived margin. **None may ever appear on the exported PDF.**

The client calls this "the single highest-risk detail in the feature" and specifies the mitigation: **print from an approved field whitelist, not by hiding columns.** Adopted as an architectural constraint — the PDF renderer receives a context object containing only whitelisted fields, so cost is not merely unprinted but absent. Backed by an automated test asserting no cost value appears in rendered output. See `03-tech-stack.md`.

## Rationale

Two real documents beat any amount of inference, and the two decisions they overturned were both inferences dressed as answers. The date era is the clearest case: B.E. is genuinely conventional in Thai commercial documents, the reasoning was sound, and it was still wrong about this company.

Numbering is the more interesting reversal. [ADR-0023](0023-quotation-belongs-to-an-opportunity.md) argued a derived number makes the paper trail legible without the system — a good argument that loses to a stronger fact: VCS already has a numbering sequence in the high 69000s that its clients recognise. Changing the format of a document number that customers use to refer to their orders is a cost with no offsetting benefit. The requirement underneath KK's instruction — that a quotation always belongs to a project — is met by the foreign key.

The whitelist-not-hiding distinction is worth preserving verbatim. Hiding a column is a template state that a future edit can undo silently. Omitting the field from the render context means a cost value cannot appear even if someone adds `{{ line.unit_cost }}` to the template — it renders empty. The failure mode changes from "leaks silently" to "visibly blank", which is the right direction for a number that must never reach a customer.

## Consequences

- Sarabun font, libthai for Thai line-breaking, and a renderer with real page-break control ([ADR-0035](0035-tech-stack-django-weasyprint.md)).
- The quotation number counter must be seeded from VCS's current value and allocated concurrency-safely.
- Bilingual data fields are removed from the model — a simplification affecting several tables.
- **Still needed from the client:** a multi-line quotation (row spacing, page breaks), a service quotation (man-hours layout), confirmation of whether a page 2 exists, discount format (amount or percentage), and revision numbering.
- `validity_text`, `delivery_date_text`, and `payment_term_text` are **text, not dates** — the samples contain `Cash`, `30 days after the date of invoice`, `See below`.
- `lead_time_text` must hold a full paragraph. QUO69054's lead time is a conditional explanation about Hazardous Substances Control Bureau import permission, not a duration. This is why `NoteSnippet` exists.
- Client snapshot fields (`bill_to_*`) are copied at issue time, so editing an account later never changes what an issued quotation reprints as.

## Revisit when

A multi-line or service quotation sample arrives — the most likely source of further layout change.
