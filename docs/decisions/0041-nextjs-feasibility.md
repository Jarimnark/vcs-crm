# ADR-0041: Next.js is feasible for the application, not for the PDF

- **Status:** ✅ **Accepted** — ecosystem assumption **confirmed** by KK, 2026-08-11. Option B. Implemented by [ADR-0042](0042-nextjs-stack-choices.md)
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Technology
- **Reopens:** [ADR-0035](0035-tech-stack-django-weasyprint.md), [ADR-0037](0037-maintainer-capability-as-a-constraint.md)
- **Constrained by:** [ADR-0036](0036-infrastructure-single-droplet.md)

## Context

KK asked whether Next.js is possible given the infrastructure.

[ADR-0037](0037-maintainer-capability-as-a-constraint.md) explicitly named this as a revisit trigger: *"If KK's actual background turns out to make a specific alternative clearly better … this is worth revisiting."* It also contains a claim made without evidence — that **"Django is the most learnable choice for someone who is not a Python developer"** — which is only true if the alternative is unfamiliar too. If TypeScript and React are KK's working ecosystem, that sentence is wrong and needs withdrawing.

So this record separates two questions that were previously entangled:

1. **Can the infrastructure run Next.js?** A memory question, answerable from numbers.
2. **Can Next.js produce the quotation PDF?** The question that actually decides the stack ([ADR-0035](0035-tech-stack-django-weasyprint.md)).

## Finding 1 — the infrastructure can run Next.js at runtime. Tightly.

[ADR-0036](0036-infrastructure-single-droplet.md)'s memory plan, recalculated:

| Component | Django (as decided) | Next.js + Python PDF sidecar |
|---|---|---|
| PostgreSQL, tuned | ~200 MB | ~200 MB |
| Application | Gunicorn ×2 ≈ 250 MB | Node standalone ≈ 150–250 MB |
| PDF renderer | *(same process)* | Python idle ≈ 80 MB |
| PDF render, transient | ~200 MB | ~200 MB |
| OS + Caddy | ~100 MB | ~100 MB |
| **Steady state** | **≈ 550 MB** | **≈ 580–630 MB** |

**The runtime difference is ~30–80 MB, not a wall.** My earlier framing — that a second runtime is disqualifying on 1 GB — was overstated. With the 2 GB swap already specified, Next.js runs.

Two real caveats, and the first is the one that matters:

- **`next build` will not fit on the droplet.** Next.js's own memory guidance is a page of mitigations — disable the webpack cache, disable source maps, disable typechecking, `webpackMemoryOptimizations`, `preloadEntriesOnStart: false`. That page reads as what it is: builds are memory-hungry. **Fix: build in CI (GitHub Actions, free) and deploy the `.next/standalone` output.** This is *better* ops than building on the server, and a Next.js developer has almost certainly done it before — unlike `pg_dump` cron.
- **Node's footprint grows toward its maximum.** Next.js preloads page modules and does not unload them, so the steady state above is the eventual state, not the warm-up. Budget for the ceiling, not the first hour.

> **A bigger box does not rescue this, and I checked because I expected it would.** In Singapore — required for ~30 ms latency to Bangkok — 2 GB is $12/mo and 4 GB is $24/mo. The whole budget is ≈ $12/mo ([ADR-0036](0036-infrastructure-single-droplet.md)). **2 GB consumes it entirely with nothing left for backups or domain; 4 GB is double it.** Hetzner is far cheaper but has no Asia region, putting ~250–300 ms on every request. The 1 GB ceiling is a genuine budget fact, not a lazy provider choice.

## Finding 2 — Next.js cannot produce this PDF, and the reason is Thai

This is the binding constraint, and re-checking it did not change the answer.

The quotation needs repeating table headers, rows that do not split, `Page x/y`, embedded per-line images, **and correct Thai** ([ADR-0031](0031-quotation-template-and-numbering.md)). Thai needs two separate things most stacks conflate:

| Requirement | Why it is hard | Python/WeasyPrint | Node |
|---|---|---|---|
| **Glyph shaping** — tone marks and vowels positioned on the right consonant | Complex-script layout | HarfBuzz, via Pango | `harfbuzzjs` — production-ready, but **shaping only**, and a `-DHB_TINY` build with functions stripped |
| **Word segmentation** — Thai has no spaces, so a naive renderer breaks lines mid-word | Needs a dictionary | `libthai`, one system package | `Intl.Segmenter('th', {granularity:'word'})` — genuinely works via Node's ICU |
| **Page-break control, repeating headers, `Page x/y`** | Layout engine | `@page` CSS, `<thead>`, counters — **free** | Hand-coded on PDFKit primitives |

The Node ecosystem has the two text pieces. **What it does not have is a layout engine that consumes them.** `@react-pdf/renderer` has an open Thai-characters issue and a well-known history of neglected complex-script support — a third party shipped an RTL fix in 2026 for breakage dating to 2019, which tells you where bidi and complex scripts sit on that roadmap. `pdfmake` and `PDFKit` have Thai *font-embedding* workarounds (`pdfmake-thai`, `addthaifont-pdfmake`) — those make glyphs appear, they are not shaping engines.

So the pure-Node path means assembling harfbuzzjs + Intl.Segmenter + PDFKit into a text layout engine, then hand-building page breaks, repeating headers and `Page x/y` on top. **That is weeks, and it is weeks spent rebuilding what `@page` CSS gives away.** Headless Chrome would solve it and needs 400–700 MB, which is the one thing the box truly cannot spare.

**WeasyPrint is not a Python preference. It is the only renderer that does all five requirements inside 200 MB.**

## The reframe that makes this work

[ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.2 already committed to sealing the PDF renderer off as a **black box**: written once during the prototype, ~100–150 lines, guarded by the sentinel cost-leak test, never touched during feature work.

**A black box does not care what language it is written in.** If the PDF is already isolated behind a stable interface, making that interface HTTP or a subprocess call instead of a Python function call changes very little — and it makes the *rest* of the codebase free.

That is the same "split runtimes" option [ADR-0037](0037-maintainer-capability-as-a-constraint.md) rejected as option 2. **It was rejected on the grounds that two runtimes mean more operations work for someone whose weak spot is operations.** That reasoning holds only while both runtimes sit on the droplet. They need not:

> **The PDF service can live off the box, for free.** A container running WeasyPrint on a free-tier serverless platform (Cloud Run, Fly.io, Render) is invoked a handful of times a day. It removes the memory collision entirely, costs nothing, and cannot OOM the droplet mid-export. Cold start of a few seconds is acceptable for a user who just clicked Export. **Cost: one more moving part, and the cost-leak whitelist now has to hold across a network boundary** — the sentinel test matters more, not less.

## The Django admin advantage is smaller than I claimed

[ADR-0035](0035-tech-stack-django-weasyprint.md) and [ADR-0037](0037-maintainer-capability-as-a-constraint.md) both leaned hard on Django's free admin for reference data. Checking that against the schema actually designed:

[`02-data-model.md`](../02-data-model.md) §3.2 deliberately uses **one `picklist` table with a `kind` column, not seven tables** — so the admin saving is *one* generic CRUD screen, not seven. Add `company` (a singleton form), `note_snippet`, and `user`. That is **four screens**, in an app that already needs bespoke forms for accounts, projects, quotations, orders, meetings, tasks, documents and expenses.

Four hand-built admin screens is a few days, not the weeks the earlier records implied. **My own normalisation decision undercut my own argument, and I did not notice until asked.**

## Options

| | Option A — Django, as decided | Option B — Next.js + WeasyPrint service | Option C — Next.js, pure-Node PDF |
|---|---|---|---|
| Runtimes to deploy | 1 | 2 (one off-box, free tier) | 1 |
| Thai PDF | Solved | Solved, unchanged | **Unproven; expect failure or weeks** |
| Admin screens | ~4 free | ~4 to build (a few days) | ~4 to build |
| Auth | Built in | Better Auth / Auth.js | same |
| Build fits on droplet | Yes | **No — build in CI** | No — build in CI |
| Cost-leak risk | In-process whitelist | **Crosses a network boundary** | In-process |
| KK writes | Python | **TypeScript** | TypeScript |

**Vercel is not the escape hatch**, and it is the first thing a Next.js developer reaches for. Hobby tier prohibits commercial use, and this is a commercial CRM; Pro is $20/mo, 1.6× the entire budget. The blocker is licensing, not technology.

## Recommendation

**Option B, if TypeScript is KK's working ecosystem. Option A if not.**

Nothing else in this record is close to as decisive as that one fact.

## The question this turns on

**Is TypeScript/React your day-to-day ecosystem?**

> ✅ **Confirmed yes**, 2026-08-11. Option B is accepted; concrete choices in [ADR-0042](0042-nextjs-stack-choices.md).

I assumed **yes** — someone who says *"I'm not good at Python"* and then proposes Next.js is very probably a JS/TS developer — and this record is written on that assumption. **If that is wrong, say so and Option A stands unchanged**, because then Next.js buys nothing and costs a runtime.

The reason this outweighs the technical arguments: a stack chosen on merit that its sole maintainer cannot comfortably work in is not a good stack ([ADR-0037](0037-maintainer-capability-as-a-constraint.md)). Two runtimes maintained fluently beats one runtime maintained reluctantly, and this is a **five-year-maintenance** question, not a build-speed one.

## Why nothing needs deciding today

**The PDF prototype is the first task under every option, and it is the same prototype.**

[ADR-0035](0035-tech-stack-django-weasyprint.md) §3.3 and [ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.2 already made it task one: render a three-page bilingual quotation with the real Thai labels, and verify page breaks, tone-mark placement, and word wrapping. That is half a day, it is WeasyPrint under both A and B, and **under B it simply becomes the service** rather than an in-process module.

So build the prototype first. It de-risks the highest-risk component, and it is **not wasted under any option** — which means this decision can wait until there is something real to judge it against.

## Consequences if Option B is confirmed

- [ADR-0035](0035-tech-stack-django-weasyprint.md) is superseded for the application layer; **its PDF reasoning survives intact and unchanged.**
- [ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.1 is withdrawn — the "Django is most learnable" claim assumed a non-TypeScript maintainer. §3.2 (isolate the renderer) and §3.3 (automate operations) hold, and §3.2 becomes *more* important.
- New: ORM choice — **Drizzle over Prisma** on a 1 GB box; Prisma's engine adds a memory floor Drizzle does not.
- New: the CI build pipeline becomes a deliverable alongside `provision.sh` and `RUNBOOK.md`.
- **The cost-leak sentinel test must run against the service boundary**, not just a function. Cost and margin now travel over a network call, so the whitelist is enforced at the point the request is built ([ADR-0031](0031-quotation-template-and-numbering.md)).
- The PDF service needs authentication. An open render endpoint that accepts arbitrary HTML is an SSRF and content-injection hazard.
- [ADR-0036](0036-infrastructure-single-droplet.md)'s memory plan is revised per Finding 1. Swap remains non-optional.
- Managed Postgres ([ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.4) stays the highest-value budget upgrade. Unaffected by this choice.
- **The 1 GB ceiling remains the growth constraint**, and now with less headroom. Beyond ~10 users the droplet is what changes.

## Revisit when

KK confirms or corrects the ecosystem assumption — or the PDF prototype completes, whichever comes first.
