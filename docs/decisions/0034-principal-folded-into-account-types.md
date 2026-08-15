# ADR-0034: `Principal` is not an entity — Account carries multiple roles

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** Client, via `adhesive-crm-user-stories.md` §3.1
- **Phase:** Domain model
- **Supersedes:** [ADR-0004](0004-principal-as-first-class-entity.md)

## Context

[ADR-0004](0004-principal-as-first-class-entity.md) made `Principal` — the brand or manufacturer VCS represents — a first-class entity, arguing that pricing, lead time, support, and distribution-agreement targets all depend on it, and that "how are we doing with each principal" is a first-order business question.

The client models this differently. `Account` carries a **multi-select `types[]`**: client / supplier / manufacturer / service_provider / logistics. A manufacturer is an Account with `manufacturer` in its types. There is no separate Principal table, and supplier-side relationships are explicitly **reserved for Phase 2**.

## Options considered

1. **Keep `Principal` as its own entity** ([ADR-0004](0004-principal-as-first-class-entity.md)).
   - Pro: a dedicated place for distribution-agreement terms, standard lead times, and per-manufacturer targets.
   - Con: two tables holding companies, with the same fields — name, address, tax ID, contacts — and an arbitrary rule about which one a given company belongs in. Worse, some companies are genuinely both: a manufacturer VCS distributes for may also buy VCS's services.
2. **Account with multi-select types** — the client's model.
   - Pro: one company, one record, however many roles it plays. Contacts, documents, and history attach in one place. Handles the both-supplier-and-client case without duplication.
   - Con: no dedicated home for manufacturer-specific attributes until Phase 2. Type-specific validation moves into application logic.
3. **Account with a single type field.**
   - Rejected outright by the client's spec, and correctly — a single type cannot express a company that is both a manufacturer and a customer, and that case exists.

## Decision

**No `Principal` table.** `Account.types[]` is a multi-select over client / supplier / manufacturer / service_provider / logistics.

**Country of origin, not manufacturer, appears on the quotation.** The samples show `Country of Origin: Germany` as a quotation header field ([ADR-0031](0031-quotation-template-and-numbering.md)) — a picklist value, not a reference to a manufacturer Account. Phase 1 does not link a quotation or a line item to the manufacturer that supplies it.

**Supplier-side relationships are Phase 2**: which manufacturer supplies which product, purchase terms, and per-manufacturer targets.

## Rationale

The client's model is better, and the reason is that [ADR-0004](0004-principal-as-first-class-entity.md) mistook a *role* for an *entity type*. "Principal" is not a kind of organisation — it is a relationship VCS has with an organisation. Modelling a relationship as a separate table means the same company appears twice the moment it plays two roles, and then the two copies drift.

Multi-select types also fits an adhesive distribution business specifically. A German manufacturer supplies the adhesive; a logistics company handles import; a service provider does calibration; and any of them might also buy something. One table, one record per company, roles as data.

The cost is real and worth stating: **the reporting [ADR-0004](0004-principal-as-first-class-entity.md) was built to enable is not available in Phase 1.** "Pipeline by manufacturer" and "performance by principal" cannot be answered, because nothing in Phase 1 links a project or a quotation line to the manufacturer behind it — only `country_of_origin`, which is a coarse proxy at best. That was the entire justification for ADR-0004, and it is being given up.

Accepted, because the alternative is worse: Phase 1 has no product master ([ADR-0032](0032-product-master-deferred-to-phase-2.md)), so there is nothing to hang a manufacturer link on except free text on each line. A manufacturer field typed by hand on every quotation line would produce exactly the spelling-variant mess that [ADR-0004](0004-principal-as-first-class-entity.md) was written to prevent. The right sequence is: product master in Phase 2, manufacturer attached to products, manufacturer reporting from there.

## Consequences

- One fewer table. Contacts, documents, and history for a manufacturer live on its Account.
- **No manufacturer-level reporting in Phase 1.** `country_of_origin` on the quotation is the only proxy, and it is a picklist, not a relationship. Report definitions must not imply otherwise.
- `types[]` needs a real multi-value implementation — a Postgres array or a join table. See `02-data-model.md`.
- Type-specific rules live in application logic. Keep them in one place; scattered type checks are how this decision gets expensive.
- Account list views need type filtering, or a customer list becomes a mixed list of customers, freight forwarders, and manufacturers.
- `Account.owner_user` and `default_payment_term` are client-oriented fields that make no sense on a logistics company. Harmless, but the UI should not demand them for non-client accounts.
- **Phase 2 sequence:** product master first, then manufacturer links on products, then manufacturer reporting. [ADR-0004](0004-principal-as-first-class-entity.md)'s reasoning is worth rereading at that point — it is right about *why* the reporting matters.

## Revisit when

Phase 2 adds the product master. That is the natural point to attach manufacturer relationships to products and revive the reporting.
