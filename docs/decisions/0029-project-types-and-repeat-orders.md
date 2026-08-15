# ADR-0029: Four project types, and consumable projects continue across repeat orders

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** Client, via `adhesive-crm-user-stories.md` §2.3–2.5
- **Phase:** Domain model

## Context

VCS distributes adhesives plus the equipment that dispenses and cures them, the spare parts for that equipment, and the services around it. Those four things sell in fundamentally different rhythms, and the client specification makes that structural rather than incidental.

An adhesive is a **consumable**: the first order is not the goal, the *reordering relationship* is. Equipment is a one-off capital sale that ends at a purchase order. Parts follow equipment, sometimes years later. Services are scoped engagements.

The client's decisive statement: **for consumables, repeat business stays within the same project.** A new project is not created per order.

## Options considered

**Where does a repeat order live?**

1. **New project per order.** The conventional CRM answer.
   - Pro: each order has a clean lifecycle; forecasting is simple; the amount field is never stale.
   - Con: contradicts the client's explicit instruction. It also fragments the relationship — twenty reorders become twenty projects, and "how is this account trending?" requires aggregating across them. For a consumable business where the relationship *is* the asset, that is the wrong grain.

2. **One project, continuing** — the client's model.
   - Pro: the project is the relationship. Follow-up compliance, reorder cadence, and lifetime margin are all properties of one record.
   - Con: `amount` on the project goes stale after the second order, and the project never closes — so "open pipeline" needs care not to double-count a project that is really an annuity.

3. **One project with child orders** — the client's model plus an `Order` record.
   - Resolves option 2's staleness. Recorded separately in [ADR-0030](0030-order-record-per-po.md).

## Decision

**Four types, with type-specific completion:**

| Type | Endpoint | Special handling |
|---|---|---|
| **Consumable** | 90 = Won (first order confirmed) → 100 = repeat ordering established | Recurring follow-up tasks |
| **Equipment** | 100 = PO received | — |
| **Part** | 100 = PO received | Optional link to the originating equipment project |
| **Service** | 100 = PO received | Withholding tax note on quotations |

**Consumable projects continue.** Reaching Won does not close the project; it changes its mode from *winning the account* to *keeping the account ordering*.

**Recurring follow-up tasks.** When a consumable project reaches Won:

- The user sets a **follow-up interval in days** on the project (e.g. 45). Editable at any time.
- The system generates a follow-up task at that interval.
- **Completing one task automatically schedules the next**, one interval ahead.
- The user can **pause or stop** recurrence when the client goes dormant.
- The interval counts from the **most recent Order date**, not the won date ([ADR-0030](0030-order-record-per-po.md)) — a client who orders early resets the clock naturally.

**Part → Equipment link is optional.** A `parent_project` reference, valid only for Part type. It exists so spare-part revenue traces back to the machine that generated it; a Part project may stand alone.

## Rationale

The type distinction earns its place because it changes system *behaviour*, not just a label. Only consumables generate recurring tasks. Only Parts have a parent. Only Services carry a withholding-tax note. A single project type with a category dropdown would need all that logic anyway, conditioned on the dropdown — so the type is real.

The continuing-project model is the client's, and on reflection it is right for the business. Adhesive distribution lives on reorder rates. Modelling each reorder as a new won deal would make the pipeline look busy while telling you nothing about whether accounts are actually retained — and retention is the number that matters when your product gets consumed and rebought.

Counting the follow-up interval from the last order rather than the won date is a small choice with a real effect: it makes the recurrence self-correcting. A client who reorders spontaneously pushes the next chase out automatically, so the system never nags someone who just bought.

The optional parent link is modelled as optional deliberately. Spare parts are frequently sold for machines VCS did not supply, or for machines predating the system. Requiring the link would force users to invent one or leave the project uncreated.

## Consequences

- **Recurring task generation needs a scheduler.** This is the first background job in the system and it has infrastructure consequences on a 1 GB droplet — see [ADR-0035](0035-tech-stack-django-weasyprint.md). A daily cron running a management command is sufficient; a task queue is not warranted.
- **Won consumable projects never leave the active list.** Any "open projects" view or stale-project report must handle them separately, or every retained account will look like neglected work. This is the same trap [ADR-0025](0025-stage-ladder-with-won-and-completed.md) identified for long delivery periods, in a more permanent form.
- Progress 90 and 100 mean different things by type ([ADR-0028](0028-progress-and-status-are-independent.md)). Reports branch on type; labels must be type-aware in the UI.
- **Consumables reaching 100 ("repeat ordering established") is a subjective judgement**, not an event the system can detect. Who decides, and on what basis? Left to the user, but it makes 100 a soft number for consumables — worth knowing before anyone reports on it.
- Pipeline reporting must decide whether a won-and-reordering consumable counts as pipeline, as revenue, or as neither. Recommend **neither**: it is an existing relationship, reported through Orders, not the forecast.
- The parent link creates a self-referencing foreign key on Project. Guard against cycles, and against a non-Part project being given a parent.
- Follow-up interval, pause state, and recurrence chain all live on the project and task records — see `02-data-model.md`.

## Revisit when

The client answers whether "repeat ordering established" has a concrete trigger, and whether won consumables should appear in pipeline views.
