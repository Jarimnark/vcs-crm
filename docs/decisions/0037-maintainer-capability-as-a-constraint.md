# ADR-0037: Maintainer capability is a design constraint — isolate Python, automate operations

- **Status:** Accepted — **§3.1 withdrawn** by [ADR-0042](0042-nextjs-stack-choices.md); §3.2–3.4 stand and §3.2 matters more
- **Date:** 2026-08-11
- **Deciders:** Claude, at KK's delegation
- **Phase:** Technology / Infrastructure
- **Refines:** [ADR-0035](0035-tech-stack-django-weasyprint.md), [ADR-0036](0036-infrastructure-single-droplet.md)

## Context

KK, asked how to treat the client's proposed stack: **"I'm not good at Python and infra, you can decide this for me."**

That is the most important constraint disclosed in this project so far, and neither the client's architecture document nor [ADR-0035](0035-tech-stack-django-weasyprint.md) accounts for it. Both reasoned purely from technical fit — memory ceiling, PDF requirements, budget — and concluded Python + Django on a self-managed droplet.

A stack chosen on technical merit that the sole maintainer cannot comfortably work in is not a good stack. [ADR-0020](0020-phase-1-scope-reassessment.md) already flagged single-maintainer bus factor as a risk; this makes it concrete and adds a second dimension: it is not just *one* person, it is one person working partly outside their comfort zone.

**What this decision must not do is over-correct.** KK has made consistently sharp design judgements throughout this project — spotting the redundancy in duplicated line items, questioning the stage model, catching the amount-correction pattern from prior experience. "Not good at Python" almost certainly means "I work in something else", not "I cannot learn a framework". The problem to solve is **unfamiliar surface area**, not capability.

## Options considered

### 1. Change the application language to whatever KK already knows

Tempting, and it fails on the PDF. The quotation is the highest-risk component ([ADR-0031](0031-quotation-template-and-numbering.md)), and every non-Python option is materially worse at 1 GB:

| Ecosystem | PDF option | Problem |
|---|---|---|
| Node / TypeScript | Puppeteer | 400–700 MB — **excluded by memory** |
| Node / TypeScript | pdfmake, PDFKit | No CSS page-break control; repeating headers and `Page x/y` hand-coded; weak Thai shaping. **Re-verified 2026-08-11 — still true** ([ADR-0041](0041-nextjs-feasibility.md)) |
| Node / TypeScript | `@react-pdf/renderer` | Open Thai-character issue; complex-script support historically neglected ([ADR-0041](0041-nextjs-feasibility.md)) |
| PHP / Laravel | mPDF | Genuinely decent Thai support and `@page`, but weaker page-break control than WeasyPrint |
| PHP / Laravel | wkhtmltopdf | Deprecated and unmaintained |
| Ruby / Rails | Prawn / wicked_pdf | Low-level, or wkhtmltopdf again |
| Go | gofpdf, maroto | Excellent memory, weakest PDF layout story of all |

WeasyPrint is not a preference. It is the only option that gets repeating headers, non-splitting rows, `Page x/y`, embedded images, **and correct Thai shaping via Pango/HarfBuzz** inside 200 MB.

### 2. Split: application in KK's language, PDF as a Python service

The pragmatic middle. WeasyPrint runs as a subprocess or tiny HTTP service; the app is whatever KK prefers.

- **Pro:** the app language becomes a free choice.
- **Con:** two runtimes on a 1 GB box, two dependency managers, two deployment paths — **more operations work, for someone who has just said operations is the weak spot.** It optimises the comfortable half and worsens the uncomfortable half.

### 3. Keep Python, but shrink the unfamiliar surface

Accept Django, and treat "reduce what KK has to hold in their head" as an explicit design goal.

## Decision

**Option 3, with three concrete commitments.**

### 3.1 Keep Django and WeasyPrint — ❌ *withdrawn, see status*

Reasoning that survives the new constraint:

- The PDF is Python regardless (option 1 is closed). Given that, a Python application means **one runtime, one dependency file, one deploy command** — the smallest total operational surface, which is what actually matters here.
- ❌ ***Withdrawn** — [ADR-0042](0042-nextjs-stack-choices.md). This claim assumed the alternative was **also** unfamiliar to KK. It was not: TypeScript is the working ecosystem, confirmed 2026-08-11. Recorded rather than deleted, because the error is instructive — reasoning about someone's capability without asking about it.* ~~**Django is the most learnable choice for someone who is not a Python developer.**~~ Its admin produces working CRUD for the entire reference-data half of this system with no code, its documentation is among the best in software, and its conventions mean there are few architectural decisions left to make. A less opinionated framework would demand more judgement in an unfamiliar language.
- Django's ORM means very little SQL needs writing by hand, so the schema in [`02-data-model.md`](../02-data-model.md) becomes model definitions rather than migrations authored by hand.

### 3.2 Isolate the PDF renderer as a black box

The one genuinely hard part of the codebase gets sealed off. `quotations/pdf.py` is:

- **Written once, during the prototype** ([`03-tech-stack.md`](../03-tech-stack.md) §3.3), before any CRM screen
- Roughly 100–150 lines: build a context dict, render a template, return bytes
- Covered by the sentinel cost-leak test, so changes that break it fail loudly
- **Never edited during normal feature work.** Adding a field to a screen does not touch it

Everything genuinely unfamiliar — Pango, libthai, font embedding, `@page` CSS — lives inside that file and its template. After the prototype it is a solved problem, not an ongoing burden.

### 3.3 Automate operations so the runbook is short

The infrastructure concern is more serious than the language one, because [ADR-0036](0036-infrastructure-single-droplet.md) implies real sysadmin work: provisioning, Postgres tuning, Caddy, cron, swap, backups, restores. Commitments:

| Burden | Mitigation |
|---|---|
| Provisioning | **One idempotent shell script**, committed to the repo, that takes a bare Ubuntu droplet to a running system. Re-runnable. Not a wiki page of steps |
| Deploy | **One command.** `make deploy` — pull, migrate, collectstatic, restart |
| Backups | Fully automated, **plus a weekly "backup succeeded" email**. Silence must not look like success ([ADR-0036](0036-infrastructure-single-droplet.md)) |
| Restore | **Rehearsed once before launch**, with the steps written down as a runbook, not reconstructed under pressure |
| Monitoring | Free-tier uptime ping + Django error email. Nothing to operate |
| Postgres tuning | Set once by the provisioning script. Never touched again at this scale |
| TLS | Caddy, automatic. Nothing to renew |

The target: **a written runbook covering the five things that can realistically go wrong** — site down, disk full, backup failing, deploy failed, restore needed — and nothing else.

### 3.4 Recommend spending headroom on reducing operational risk

[ADR-0036](0036-infrastructure-single-droplet.md) leaves ≈1,750 THB/year unspent against the ceiling. The instinct is to bank it. **Better to spend it on removing operations work.**

And a stronger recommendation to put to the client (open question N8): **if the budget can reach ~8,000 THB/year, managed PostgreSQL at $15/month becomes affordable — and that removes the single largest operational burden** from a maintainer who has said infrastructure is their weak spot. No tuning, no `pg_dump` cron, no restore rehearsal, point-in-time recovery included.

That is the highest-value upgrade available to this project, and the reason to ask has now changed: it is no longer about resilience in the abstract, it is about matching the system to who will run it.

## Rationale

The interesting thing about this constraint is that it does *not* change the stack — and it took working through the alternatives to be confident of that. The PDF requirement is genuinely binding, so the language was never really free; the only real question was whether to split runtimes, and splitting makes the operations problem worse in order to make the language problem better. Since operations is the weaker of the two areas, that trade goes the wrong way.

What the constraint changes is **everything around** the stack. Left unrecorded, this project would have shipped a design that is technically correct and quietly unmaintainable — the kind of outcome where every individual decision is defensible and the whole thing still fails, because nobody wrote down who has to live with it.

The managed-Postgres recommendation is the clearest expression of that shift. [ADR-0036](0036-infrastructure-single-droplet.md) treated self-hosting as an acceptable cost-driven trade-off, which it is on the numbers. With the maintainer's comfort factored in, the calculation changes: $180/year to eliminate database operations from a project run by one person who does not want to do database operations is good value, not an indulgence.

## Consequences

- **The stack is unchanged.** Django, PostgreSQL, WeasyPrint ([ADR-0035](0035-tech-stack-django-weasyprint.md)).
- The PDF prototype becomes **even more clearly the first task** — it front-loads the entire unfamiliar portion of the build into one bounded exercise, before any dependency on it exists.
- Two artefacts are now deliverables rather than nice-to-haves: **`provision.sh`** and **`RUNBOOK.md`**. Neither is optional.
- Django's admin should be used **aggressively** for reference data — every screen it covers is a screen not written in an unfamiliar framework.
- Prefer boring, well-documented Django patterns over clever ones. Optimise the code for someone reading it in six months without daily Python fluency.
- **Put the budget question to the client with the new reasoning** (N8). Managed Postgres is now recommended, not merely mentioned.
- **Bus factor remains unresolved and is not a technical problem.** Who else has the DigitalOcean account, the domain, and the backup GPG key? Automation does not answer that ([ADR-0036](0036-infrastructure-single-droplet.md) §11).
- If KK's actual background turns out to make a specific alternative clearly better — a strong Laravel background and a willingness to accept mPDF's weaker page-break control, for instance — this is worth revisiting. The PDF prototype is the test either way, and it is cheap to run twice.

## Revisit when

The PDF prototype completes. If WeasyPrint fails on Thai or page breaks, the language question reopens from scratch — and at that point option 2's split becomes the likely answer rather than the rejected one.
