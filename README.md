# VCS CRM

Internal web CRM for **VCS**, a distributor of **adhesives** (DELO products) plus the equipment that dispenses and cures them, its spare parts, and the services around them.

Built for a team of ~5 sales engineers. Phase 1 delivers project tracking, activity logging, document storage, and **quotation generation to PDF** — bilingual Thai/English, multi-page, with cost and margin captured internally and never printed.

**Status:** design complete, pending client answers. No code yet.

> **Terminology:** what a generic CRM calls an *Opportunity*, VCS calls a **Project**.

## Read this first

| Document | What it is |
|---|---|
| [`docs/00-product-concept.md`](docs/00-product-concept.md) | **Start here.** Vision, users, the project model, scope, metrics, risks, open questions |
| [`docs/01-user-flows.md`](docs/01-user-flows.md) | Critical paths, screen by screen |
| [`docs/02-data-model.md`](docs/02-data-model.md) | Table-by-table schema: columns, types, constraints, indexes |
| [`docs/03-tech-stack.md`](docs/03-tech-stack.md) | Django + PostgreSQL + WeasyPrint, and the PDF architecture |
| [`docs/04-infrastructure.md`](docs/04-infrastructure.md) | Hosting, backups, security, operations |
| [`docs/decisions/`](docs/decisions/README.md) | 36 decision records, with reasoning and rejected alternatives |
| [`user-story/`](user-story/) | **Client source documents (2026-08-10) — the trusted source of knowledge** |

> ⚠️ **In the decision log, read [ADR-0027](docs/decisions/0027-adopt-client-phase-1-specification.md) before ADRs 0001–0026.** On 2026-08-11 the client specification arrived and became authoritative. It supersedes seven earlier records and amends six more. Reading the log front-to-back without it will produce the wrong system.

## The shape of it

| | |
|---|---|
| **Project state** | Two independent fields — **Progress %** (10–100, fixed steps) and **Status** (Open / Won / Lost). Progress freezes on loss, so *lost-at-what-stage* is answerable |
| **Project types** | Consumable · Equipment · Part · Service. Consumables **continue across reorders** with recurring follow-up tasks |
| **Money** | Three figures, never conflated: `expected_amount` (forecast) · `quoted_value` (derived) · **Orders** (actual revenue, one per PO) |
| **Quotation** | The centrepiece. Typed lines with autocomplete, no product master in Phase 1. Cost captured per line so margin is reportable |
| **Stack** | Python + Django, PostgreSQL, **WeasyPrint** for PDF |
| **Hosting** | One DigitalOcean 1 GB droplet, Singapore. **5,000 THB/year** ceiling |

## Two constraints that shaped everything

**1 GB of RAM.** It excludes headless-Chrome PDF generation, managed Postgres, object storage, and a permanent staging environment. Those exclusions reach into the application design — WeasyPrint over Puppeteer, cron over Celery, a semaphore around PDF rendering.

**Cost must never reach a customer.** Quotation lines carry unit cost and margin. The client calls a cost column on a client-facing quotation "a serious commercial problem". Mitigated architecturally: the PDF renderer receives only whitelisted fields as plain dictionaries, so cost is *absent* rather than hidden — backed by an automated test using sentinel values.

## Working agreement

Every design decision — product, infrastructure, or code — gets a record in `docs/decisions/` at the moment it is made, so anyone picking the project up later can reconstruct *why*, not just *what*.

- One decision per file, numbered `NNNN-short-title.md`.
- **Records are immutable.** A changed decision gets a new record superseding the old one. Never rewrite history — the wrong turns are part of the context, and several in this log are the most instructive entries in it.
- Small decisions count. Three lines is a fine record.
- Update the index in [`docs/decisions/README.md`](docs/decisions/README.md) when adding one.

## What's blocking

**Before the quotation build** — the largest and riskiest component:

1. **A multi-line quotation sample** (three or more lines). Both client samples have one line, so row spacing, terms placement, and page breaks are all untested. *The single most valuable input outstanding.*
2. **Is there a page 2 today?** Neither sample shows bank details or terms and conditions.
3. **Discount format** — amount or percentage?
4. **Revision numbering** — suffix (`QUO69054-R2`) or a new number?
5. **The current quotation counter value** — numbering must continue from VCS's existing sequence (high 69000s), not restart.

**Before the project model is built:**

6. **Do progress and status interact?** Does status become Won automatically at 90 / 100, or is it set by hand?
7. **Progress labels for 40, 60, 80** — inferred, not stated.
8. **Lost reason codes** — final list.
9. **What triggers "repeat ordering established" (100)?** The system cannot detect it.

Ten further questions need answers before launch but not before build — see §10 of the product concept.

## First task, before any screen

**Prototype the quotation PDF.** Three pages, bilingual, real Thai labels from the samples, on droplet-sized memory. Thai has no spaces between words and breaks mid-word without `libthai` — silently, producing subtly wrong output on documents sent to customers. This prototype is the gate on the entire stack; see [`docs/03-tech-stack.md`](docs/03-tech-stack.md) §3.3 for the checklist.
