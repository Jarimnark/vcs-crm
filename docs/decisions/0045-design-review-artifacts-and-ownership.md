# ADR-0045: Kwang owns UX/UI and PM; design is reviewed through a Phase 1 prototype and a data-model view

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Kwang
- **Phase:** Product / Process

## Context

The design set (concept, flows, data model, 44 records) is complete on paper, but no screen has been drawn and the schema exists only as a long table-by-table document. Kwang joins as UX/UI designer and project manager and needs two things to take ownership: a way to see the product, and a way to see the data behind it.

## Options considered

1. **Wireframe every screen in the product shape (§6 of the concept)** — complete, but slow, and most screens are routine CRUD that the flows already describe.
2. **Prototype the Phase 1 critical paths first** — the screens the flows say carry the product (My Tasks, the quotation builder, the reorder loop), plus the screens needed to reach them.
3. **Start with infrastructure architecture as well** — already decided in ADR-0036 / ADR-0044; no new information needed yet.

## Decision

- Kwang is responsible for UX/UI design and project management from 2026-11-04.
- **Prototype Phase 1 screens first**, following `docs/01-user-flows.md` Flows A–G. Built as a claude.ai Design canvas so it can be commented on and shared with the client.
- **Data architecture covers the data model only for now.** Infrastructure architecture is out of scope until Kwang asks for it.
- The prototype uses a **clean neutral look**, not an existing design system (Ember DS and SugarCane DS belong to other products). A **VCS design system** will be created afterwards, and the prototype restyled onto it.
- The data-model view is a **rendering of `docs/02-data-model.md`**, not a second source of truth. When the schema changes, the document changes first (with a record here), then the view.

## Rationale

The flows already identify Flow C (quotation) and Flow E (reorder loop) as the product. Seeing them early is the cheapest way to find the gaps the documents cannot show, and the open client questions (B1–B11) are easier to ask with a screen in front of the client.

## Consequences

- Design feedback on screens should come back as records here when it changes a flow, a field or a rule.
- Two artifacts now describe the product; the repo documents win when they disagree.

## Revisit when

The client answers B1–B11, or the prototype shows a flow that the documents got wrong.
