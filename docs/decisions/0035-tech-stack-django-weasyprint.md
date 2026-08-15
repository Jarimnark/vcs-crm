# ADR-0035: Python + Django + PostgreSQL + WeasyPrint

- **Status:** ⚠️ **Superseded for the application layer** by [ADR-0042](0042-nextjs-stack-choices.md) · **PDF reasoning remains authoritative** · refined by [ADR-0040](0040-fx-rate-at-quotation-level.md)
- **Date:** 2026-08-11
- **Deciders:** KK, following `phase1-architecture-decisions.md` Part B
- **Phase:** Technology

> **The application layer is superseded; the PDF analysis is not.** KK confirmed Next.js on 2026-08-11 ([ADR-0041](0041-nextjs-feasibility.md), [ADR-0042](0042-nextjs-stack-choices.md)), so **Django, Gunicorn, Django templates and the Django admin no longer apply.**
>
> **Everything this record says about the PDF stands, and was re-verified rather than assumed:** WeasyPrint is the only renderer meeting all five layout requirements plus correct Thai inside 200 MB; headless Chrome is still excluded at 400–700 MB; libthai, Sarabun, the `@page` CSS and the prototype-first sequencing are unchanged. WeasyPrint now runs as an **off-box service**, which is better than the in-process design here — it can no longer OOM the droplet.
>
> Read §2 and §3 as current. Read §"Decision" application rows as historical.

## Context

The stack is constrained by two hard limits and one hard requirement.

**Budget: 5,000 THB/year** (≈ USD 145) for everything. That resolves to a single 1 GB droplet ([ADR-0036](0036-infrastructure-single-droplet.md)) — managed Postgres alone exceeds the entire annual budget.

**Memory: 1 GB**, shared between database, application, and PDF rendering.

**The quotation PDF** needs repeating table headers, rows that do not split across pages, `Page x/y` numbering, embedded per-line images, and a totals block that stays with its terms ([ADR-0031](0031-quotation-template-and-numbering.md)) — rendered in bilingual Thai and English.

The client's document is emphatic that the PDF requirement, not the CRM records, is what should decide the stack. That is correct: record management is easy in any framework, and the PDF is where a wrong choice becomes expensive to reverse.

## Options considered

### PDF renderer — the deciding choice

| Option | Memory per render | Verdict |
|---|---|---|
| **Headless Chrome** (Puppeteer, Playwright, Gotenberg) | 400–700 MB | **Excluded.** Will OOM on a 1 GB box also running Postgres. The most common HTML-to-PDF method is unavailable |
| **WeasyPrint** (Python, HTML/CSS → PDF) | 100–200 MB | **Chosen** |
| **ReportLab** / low-level PDF libraries | Low | Page-break control, repeating headers, and `Page x/y` must all be hand-coded. Weeks of work for what CSS gives free |
| **LibreOffice headless** from a template | 300–500 MB + slow | Marginal on memory; poor layout control |

WeasyPrint covers every requirement natively:

| Requirement | Mechanism |
|---|---|
| Repeating table header | `<thead>` repeats natively |
| Rows that do not split | `page-break-inside: avoid` |
| `Page 1/3` | `@page` margin boxes, `counter(page)` / `counter(pages)` |
| Quotation number on every page | `string-set` + `content: string(...)` |
| Per-line images | Standard `<img>` |
| Thai text shaping | Pango + HarfBuzz — correct tone and vowel mark positioning |

### Application framework

**Django**, chosen for two specific reasons rather than general preference: the built-in admin covers picklists, `Company` settings, `NoteSnippet`, and user management with essentially no build effort — real value when the budget is this tight — and Python is the native fit for WeasyPrint, avoiding a second runtime on a 1 GB box.

Rails or Node would both work for the CRM half. Neither has a PDF story that fits 1 GB as well.

**Low-code platforms are excluded.** The client's C10 makes the right test: low-code handles records well and breaks down on bilingual multi-page PDF with strict layout control. The quotation output decides, and it decides against them.

## Decision

| Layer | Choice |
|---|---|
| Application | **Python 3 + Django** |
| Database | **PostgreSQL**, self-hosted on the droplet |
| PDF | **WeasyPrint + libthai + Sarabun** |
| Web server / TLS | **Caddy** (automatic Let's Encrypt) |
| App server | **Gunicorn**, 2 sync workers |
| File storage | **Local disk** on the droplet |
| Background jobs | **cron + Django management command** — no task queue |
| Email | API-based provider free tier (Resend or Brevo) |
| Frontend | Django templates + progressive enhancement. No SPA |

### Thai rendering — three non-negotiables

1. **Install `libthai`.** Thai has no spaces between words. Without libthai the renderer breaks lines mid-word. A one-line system package, easy to miss, and its absence produces subtly wrong output rather than an error.
2. **Sarabun font**, embedded. Thai government standard document font, free, includes matching Latin glyphs for the bilingual layout. Noto Sans Thai is the fallback.
3. **Prototype before committing.** Render a three-page bilingual quotation with the real Thai labels from the samples and verify page breaks, tone mark placement, and word wrapping. Half a day now against a rebuild later.

### Background jobs — cron, not Celery

Recurring follow-up tasks ([ADR-0029](0029-project-types-and-repeat-orders.md)) are the only background work in Phase 1. A daily `cron` invoking a Django management command is sufficient. Celery would add a broker (Redis, ~50–100 MB) and a worker process to a machine with no memory to spare, to run one job a day.

Idempotency matters more than scheduling precision: the command must be safe to run twice on the same day, since cron gives no execution guarantees.

### PDF generation is synchronous, with a lock

Rendering happens in the request cycle — a few seconds is acceptable for a user who just clicked Export. But a 200 MB transient allocation on a 1 GB box means **two concurrent renders can exhaust memory.** Guard with an application-level semaphore limiting renders to one at a time; a second request waits.

### The cost-leak whitelist

[ADR-0031](0031-quotation-template-and-numbering.md) requires that cost and margin cannot reach the PDF. Implementation:

- A dedicated `build_quotation_pdf_context()` function constructs the render context from an **explicit field whitelist**. `unit_cost`, `cost_currency`, `line_margin`, `total_cost`, `total_margin` are never placed in it.
- The template receives plain dictionaries, **not Django model instances** — so `{{ line.unit_cost }}` cannot resolve even if someone writes it.
- **An automated test** renders a quotation whose cost values are distinctive sentinel numbers, extracts the PDF text, and asserts none appear. This test is the actual guarantee; the whitelist is how it stays passing.

### The multi-currency gap

The client spec puts `unit_cost` + `cost_currency` on the line and a single selling currency on the quotation, and defers FX to Phase 2. **Margin is then uncomputable** whenever cost currency differs from selling currency — which is the normal case, since VCS buys from Germany and sells in Thai Baht. Since margin reporting is the stated reason for capturing cost at all, the minimum fix belongs in Phase 1:

- `Quotation.cost_currency` and `Quotation.fx_rate_cost_to_selling` — entered once per document, **frozen at issue**, `1.0` when currencies match.
- `line_margin` computed in the quotation's selling currency using that frozen rate.

This is the [ADR-0015](0015-multi-currency.md) frozen-rate principle at its minimum viable size: two header fields, no rate table, no daily maintenance. A full `ExchangeRate` table can wait for Phase 2. Without the rate, `total_margin` is either wrong or null on most quotations.

**Placement is header-level, not per line** — see [ADR-0040](0040-fx-rate-at-quotation-level.md). A per-line rate lets one document carry eight slightly different EUR rates, which is silently wrong; one rate per document cannot be internally inconsistent. The cost is that all line costs on a quotation share one currency.

## Rationale

Letting the PDF choose the stack is the right call because it is the only component here with a hard technical constraint. CRUD over ten tables for five users imposes no meaningful requirement on the framework; a bilingual, multi-page, page-break-controlled PDF in 200 MB does. Choosing the framework first and discovering the renderer does not fit is the expensive order.

Excluding headless Chrome deserves emphasis because it is the default answer to HTML-to-PDF and it is unavailable here. Anyone joining this project will reach for Puppeteer; the memory arithmetic is why they should not.

Django's admin is the second reason, and it is a budget argument rather than an aesthetic one. Picklists, company settings, note snippets, and user management are perhaps a week of CRUD screens that the admin provides free. On a project this size that week is a material fraction of the build.

The `libthai` note is included because it is the most likely small mistake with the largest visible consequence: correct-looking Thai text broken in the middle of words on a document sent to customers.

## Consequences

- **Prototype the PDF first.** Before any CRM screen. A three-page bilingual render on the target droplet size, with real Thai labels, is the gate on this whole stack.
- Memory plan: Postgres ~200 MB, Gunicorn ~250 MB, WeasyPrint ~200 MB transient, OS ~100 MB. **2 GB swap** as margin ([ADR-0036](0036-infrastructure-single-droplet.md)).
- Render concurrency limited to one. With five users this will effectively never be hit, but the guard must exist.
- No SPA means no API layer to build — appropriate at this size, and it keeps memory down.
- Django's `ArrayField` handles `Account.types[]` natively, which is a small argument for Postgres over alternatives.
- `python-thai-nlp` and similar are **not** needed. Line breaking is libthai's job, at the Pango layer.
- Email exists only for password reset ([ADR-0036](0036-infrastructure-single-droplet.md)). DigitalOcean blocks outbound port 25, so an API-based provider is required — raw SMTP will not work.
- Deployment is simple by necessity: git pull, migrate, collectstatic, restart Gunicorn. No containers — Docker's overhead is not free at 1 GB.

## Revisit when

The PDF prototype fails on Thai rendering or page breaks — the one outcome that would force reconsidering the renderer, and therefore the language. Also revisit if users grow past ~10, at which point the droplet is the constraint before the stack is.
