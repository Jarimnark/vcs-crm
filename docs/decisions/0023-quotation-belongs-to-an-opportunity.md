# ADR-0023: Every quotation belongs to an opportunity, and its number derives from the opportunity code

- **Status:** ⚠️ Superseded by [ADR-0031](0031-quotation-template-and-numbering.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Domain model
- **Resolves:** Open question Q15 (structure; the literal format is still to be provided)

> **Superseded 2026-08-11.** Numbering is a global `QUO#####` counter continuing VCS's existing sequence (already in the high 69000s), not derived from the project code — see [ADR-0031](0031-quotation-template-and-numbering.md). **The mandatory project link survives**, which was this record's substantive point: an optional link produces orphaned quotations and an under-reported pipeline. Only the *expression* of the link in the number is dropped.

## Context

Q15 asked what format quotation numbers should take. KK's answer changed the shape of the question rather than just filling it in: **"quotation must relate to opportunity. The opp prefix/suffix will be provided later."**

Two things follow. First, the quotation-to-opportunity link is **mandatory**, not optional — [ADR-0012](0012-quotation-is-phase-1-core.md) had left this loose. Second, the quotation number is **derived from the opportunity's identifier**, which means the opportunity needs a human-readable code of its own. It did not have one.

## Options considered

**Is the opportunity link mandatory?**

1. **Optional** — allow a standalone quotation for a quick price with no deal behind it.
   - Pro: convenient for a one-line price request.
   - Con: quotations become orphaned records. The pipeline under-reports, because quoted work exists that no opportunity knows about. Forecasting quietly misses real deals.
2. **Mandatory** — a quotation cannot exist without an opportunity.
   - Pro: every quote is visible in the pipeline by construction. Nothing is invisible.
   - Con: a quick price quote requires creating an opportunity first.

**Number structure**

1. **Independent sequence** — quotations numbered globally, opportunity referenced as a separate field.
   - Pro: simple, gap-free by construction.
   - Con: the number itself carries no information; relating a quotation to its deal requires a lookup. KK's requirement points away from this.
2. **Derived from the opportunity code** — quotation number contains the opportunity's identifier plus a sequence and revision.
   - Pro: the number is self-describing. Anyone — SE, customer, bookkeeper — can see which deal a quotation belongs to from the number alone, on paper, without the system.
   - Con: not a single gap-free global sequence, which may matter to whoever keeps the books.

## Decision

**`Opportunity` gains an `opportunity_code`** — human-readable, unique, auto-assigned on creation, immutable thereafter. Displayed prominently on the opportunity record.

**Every `Quotation` requires an `opportunity_id`.** Not nullable. Creating a quotation from scratch prompts for or creates the opportunity first.

**The quotation number derives from the opportunity code**, with a sequence for multiple quotations on the same deal and a suffix for revisions. Structurally:

```
<opportunity_code>-<quotation sequence>-<revision>
```

so that a second quotation's third revision on opportunity `X` reads as `X-02-R3`.

**The literal format — prefix, separator, year placement, padding — is configurable and will be supplied by KK.** Both the opportunity code pattern and the quotation number pattern are configuration, not code, so the format can be set without a release and changed if it proves wrong.

**Numbers are assigned at creation and never reused**, including when a draft is deleted. A deleted draft leaves a gap.

## Rationale

Making the link mandatory is the more consequential half of this decision. An optional link seems harmless and reliably produces the same failure: quotes get issued against no deal, the pipeline under-reports, and the forecast is wrong in a direction nobody can see. Forcing an opportunity first costs a few seconds and guarantees that everything quoted is something the business knows about. The "quick price with no deal" case is not really an exception — if VCS quoted it, it is a deal.

Deriving the number from the opportunity makes the paper trail work without the system. Quotations get printed, emailed, forwarded, and filed by people who will never log in. A number that says which deal it belongs to is legible to all of them; an opaque sequence requires a lookup nobody will do.

The gap question is the real trade-off, and it is worth being explicit about. Derived numbering is not a single gap-free sequence, and Thai bookkeeping practice does care about gap-free sequences — but that requirement attaches to **tax invoices**, which the CRM does not issue ([ADR-0018](0018-no-erp-invoice-boundary.md)). Quotations are commercial documents with no such obligation. If that assumption is wrong, this decision needs revisiting before build.

## Consequences

- `opportunity_code` is a new required field, assigned at creation. The pattern must be decided before the first record exists — retrofitting codes onto live data is unpleasant.
- Sequence allocation needs to be concurrency-safe. With under 10 users the risk is low, but two SEs creating opportunities simultaneously must not collide.
- Codes are immutable. If an opportunity is created in error, it is cancelled, not renumbered — its code stays consumed.
- Revisions extend the number rather than replacing it, so revision 1 and revision 3 are visibly the same quotation ([ADR-0012](0012-quotation-is-phase-1-core.md)).
- Merging duplicate opportunities becomes awkward: the losing opportunity's code is already on issued quotations. Merge must preserve both codes as an alias rather than deleting one.
- **Still needed from KK:** the literal opportunity code pattern (prefix, year, sequence width) and the quotation number pattern. Configuration, so it does not block modelling — but it does block issuing the first real quotation.

## Revisit when

KK supplies the format, or if it turns out someone does require gap-free quotation numbering.
