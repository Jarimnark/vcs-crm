# ADR-0042: The Next.js stack — and the seven guardrails Django was providing for free

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Technology
- **Implements:** [ADR-0041](0041-nextjs-feasibility.md)
- **Supersedes (application layer only):** [ADR-0035](0035-tech-stack-django-weasyprint.md)

## Context

[ADR-0041](0041-nextjs-feasibility.md) established that Next.js is feasible for the application and that WeasyPrint must keep the PDF. KK has confirmed Next.js as the fullstack framework, so the ecosystem assumption in that record is resolved: **TypeScript is the working language.**

This record makes the concrete choices, and — more importantly — records **what Django was silently doing that now has to be done deliberately.** That second half is the reason this record is long. The framework swap is easy; the guardrails are where a five-user CRM holding a company's entire commercial pipeline gets quietly broken.

## Decision — the stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.x, App Router** | Server Components + Server Actions |
| Language | **TypeScript**, `strict: true` | |
| Database | **PostgreSQL 16**, self-hosted | Unchanged ([ADR-0036](0036-infrastructure-single-droplet.md)) |
| ORM / migrations | **Drizzle** | Not Prisma — no engine binary, lower memory floor |
| Validation | **Zod**, at every server-action boundary | Not optional — see G1 |
| Auth | **Better Auth**, email + password | Argon2id via `@node-rs/argon2` |
| **PDF** | **WeasyPrint + libthai + Sarabun, as an off-box service** | Unchanged renderer ([ADR-0035](0035-tech-stack-django-weasyprint.md)) |
| Money arithmetic | **`decimal.js`** on `NUMERIC`-as-string | See G3 |
| Web server / TLS | **Caddy** | Unchanged |
| Process manager | **systemd** | Already present for Caddy; one fewer thing than PM2 |
| Build | **GitHub Actions → `.next/standalone`** | Does not fit on the droplet |
| Background jobs | **system cron → authenticated route handler** | No queue |
| Email | Resend or Brevo free tier, API not SMTP | Unchanged |
| Files | Local disk, served through an authenticated route | Unchanged |

**No Docker on the droplet, no SPA, no Redis, no queue.** Each omission is still a memory decision.

**Rejected: `mode: 'number'` on any money column. Rejected: Vercel** (Hobby forbids commercial use; Pro is 1.6× the budget — [ADR-0041](0041-nextjs-feasibility.md)).

### The PDF service

WeasyPrint runs in a container on a free-tier serverless platform (Cloud Run, Fly.io, or Render), invoked a few times a day.

- **Concurrency 1.** The [ADR-0035](0035-tech-stack-django-weasyprint.md) render semaphore becomes a platform setting instead of application code — the same guarantee, less to write.
- **It cannot OOM the droplet.** This is strictly better than the in-process design it replaces.
- **It must authenticate.** A render endpoint that accepts arbitrary HTML from the internet is an SSRF and content-injection hazard. Shared secret minimum, and it must not be reachable without it.
- **Cold start of a few seconds is acceptable** for a user who just clicked Export. If it proves annoying, the fallback is a tiny always-on container, not moving the renderer.

## The seven guardrails

Django provided these by default or by making them hard to get wrong. Next.js does not. **Each one below is a real defect risk in this specific application**, not general advice.

### G1 — Every Server Action is a public POST endpoint

Next.js documents this plainly: an action is reachable by anyone who can send the POST, and **"render-time gating (only rendering a form on an authenticated page) is not a security boundary."**

The docs also make the sharper point, which is the one that matters here:

> *"Schema validation (zod or similar) only checks the shape of the input. A well-formed `Item` object can still refer to a row the caller does not own."*

That is **exactly** the expense-visibility rule from [ADR-0039](0039-minimal-expense-capture-reinstated.md). A validated `{expenseId: 42}` is well-formed and may belong to someone else.

**Rule:** every action authenticates, authorizes, then validates — in that order. Take an **ID plus the change**, never a client-supplied object, and re-read the row scoped by the session.

```ts
// ✗ Well-formed and wrong: trusts a client-supplied row
export async function updateExpense(expense: Expense) { … }

// ✓ Reference + change, ownership enforced in the query
export async function updateExpenseNote(expenseId: number, note: string) {
  const session = await requireSession()
  const parsed = NoteSchema.parse(note)
  const rows = await db.update(expenses).set({ note: parsed })
    .where(and(eq(expenses.id, expenseId),
               eq(expenses.incurredByUserId, session.userId)))  // ← the boundary
    .returning()
  if (!rows.length) return notFound()   // not "forbidden" — don't confirm it exists
}
```

**Enforced by a Data Access Layer**, since Drizzle has no equivalent of a Django default manager. `lib/data/expenses.ts` is the only module that may import the `expenses` table, and it exports no unscoped query. [ADR-0039](0039-minimal-expense-capture-reinstated.md) said "enforce in the data-access layer, not the UI" — under Django that was good practice; here it is the only mechanism available.

### G2 — Unused props still ship to the browser

**"If a Client Component receives a value as a prop and doesn't use it, it's still sent to the client."** It is serialized into the RSC payload in the page's `<script>` tags. A US government site leaked grant IDs exactly this way.

This is a **new leak vector that did not exist with Django templates**, where `{{ line.unit_cost }}` rendered server-side and only the output left the building. It threatens two things this project has already committed to protecting:

| At risk | How it leaks |
|---|---|
| **Another user's expenses** ([ADR-0039](0039-minimal-expense-capture-reinstated.md)) | A list component receiving full rows ships every field, including rows the UI filtered out client-side |
| **Cost and margin** ([ADR-0031](0031-quotation-template-and-numbering.md)) | Passing a whole `quotationLine` to a client component puts `unit_cost` in the HTML of pages that never display it |

**Rules:**

1. **Server Components by default.** `'use client'` is a deliberate act, and every one is a serialization boundary to think about.
2. **Pass fields, never objects.** `<Row id={l.id} desc={l.description} />`, not `<Row line={l} />`.
3. **DTOs at the data-access layer** — the query returns UI-shaped objects, so cost is never in scope to leak.
4. **React's taint APIs** (`taintObjectReference`, `taintUniqueValue`) on cost and expense rows, so a mistake throws instead of shipping.

> **Note on the PDF whitelist.** [ADR-0031](0031-quotation-template-and-numbering.md)'s concern is cost reaching *customers*, and internal users may see cost — so G2 is not primarily a PDF issue. But the PDF whitelist now also crosses a network boundary to the render service, so the sentinel test matters more, not less. It moves from unit test to integration test.

### G3 — `NUMERIC` arrives as a string, and the convenient fix destroys money

Drizzle returns `numeric` as a **string** by default, deliberately, to preserve precision. It offers `mode: 'number'` — which converts to a JS float.

**`mode: 'number'` is banned on every money column.** This is a quotation system; `0.1 + 0.2 !== 0.3` reaching a customer-facing total is among the worst outcomes available. Django's ORM handed back `Decimal` and made this invisible; here it is one config option away from being wrong, and wrong quietly.

**Rule:** money stays a string from the database, enters `decimal.js` for arithmetic, and is formatted for display. Never `parseFloat`, never `Number()`, never arithmetic on the raw string.

`02-data-model.md`'s convention — *"Money `NUMERIC(15,2)`. **Never** float"* — was a schema instruction under Django. It is now an application discipline, and **test 4 in the testing priorities is what actually enforces it.**

### G4 — The 1 MB body limit versus a 4 MB phone photo

Server Action requests are capped at **1 MB by default.** This project uploads per-line product images ([ADR-0031](0031-quotation-template-and-numbering.md)) and receipt photos taken on a phone ([ADR-0039](0039-minimal-expense-capture-reinstated.md)) — routinely 3–5 MB.

Uploads through a Server Action would fail on real photos, and the failure arrives at the worst moment: an engineer in the field, one-handed, in the sun ([ADR-0038](0038-responsive-web-desktop-first.md)).

**Decision: uploads go through a Route Handler, not a Server Action** — with its own auth check, a size cap, a MIME allowlist, and **resize-on-arrival** (already required by [ADR-0036](0036-infrastructure-single-droplet.md) for disk reasons). `serverActions.bodySizeLimit` stays at its default so that a large payload anywhere else is a bug that surfaces loudly.

### G5 — Caching is a liability here, not a feature

Next.js caching exists to make read-heavy public pages fast. **This app has no public pages and five users.** Every route is authenticated and every figure must be current — a cached quotation total or a stale project stage is a defect, and route-level caching of authenticated pages risks serving one user's data to another.

**Rule:** authenticated routes render dynamically. No `revalidate` on data reads. Cache nothing user-scoped. The performance ceiling this gives up is worth nothing at five users; the correctness it buys is worth a lot.

### G6 — Two environment variables that break things quietly

| Variable | If wrong |
|---|---|
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Must be **set and stable across restarts and deploys.** Next.js encrypts closure variables with it. Unset means it is regenerated, and actions fail after a restart in ways that look random |
| Action IDs rotate on deploy | Next.js rotates them at least every 14 days even with unchanged source. A user mid-session on the old build gets **"Failed to find Server Action"** |

**Both go in `provision.sh` and the runbook** ([ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.3). For the second, the UI surfaces a retry rather than a hard failure — a refresh must recover the user, not lose their draft quotation.

### G7 — The patch cadence is now an operational requirement

**CVE-2025-55182 ("React2Shell")** was a remote-code-execution flaw in React Server Components' Flight payload deserialization, exploited in the wild. This is not a reason to avoid the stack, but it is an honest cost of it: **RSC is a more actively targeted attack surface than a Django app behind Caddy**, and the vulnerable component is the framework's core request path rather than an optional dependency.

**Rule:** Next.js and React security releases are applied promptly, not batched with feature work. The runbook gains a sixth entry — *"a security release is out"* — alongside the five failure modes [ADR-0037](0037-maintainer-capability-as-a-constraint.md) specified. Dependabot or equivalent is on from day one.

## What is unchanged, and why that is the point

- **The entire PDF analysis** ([ADR-0035](0035-tech-stack-django-weasyprint.md) §2–3, [`03-tech-stack.md`](../03-tech-stack.md) §2–4). WeasyPrint, libthai, Sarabun, the `@page` CSS, the ten-item prototype checklist, the cost-leak whitelist, the sentinel test. Re-verified against the Node ecosystem in [ADR-0041](0041-nextjs-feasibility.md), not assumed.
- **The data model** ([`02-data-model.md`](../02-data-model.md)). 19 tables, every constraint, every index. Drizzle expresses the same DDL; the schema was never Django-specific.
- **All 40 prior product and domain decisions.** None of them were framework decisions.
- **The infrastructure shape** ([ADR-0036](0036-infrastructure-single-droplet.md)) — one droplet, self-hosted Postgres, 2 GB swap, nightly offsite dumps.
- **[ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.2 and §3.3** — isolate the renderer, automate operations. §3.2 becomes *more* true: the black box is now a network boundary.

**[ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.1 is withdrawn.** "Django is the most learnable choice for someone who is not a Python developer" assumed the alternative was also unfamiliar. It was not.

## Rationale

The framework choice was close on technical merit and not close on maintainability. [ADR-0037](0037-maintainer-capability-as-a-constraint.md)'s central finding stands: a stack its sole maintainer cannot comfortably work in is not a good stack, and this is a five-year maintenance question, not a build-speed one. Two runtimes maintained fluently beats one maintained reluctantly.

What changed my confidence was discovering that **the split is cheaper than [ADR-0037](0037-maintainer-capability-as-a-constraint.md) assumed**, for a reason that record missed: it evaluated the PDF service as a second process *on the droplet*, where it competes for 1 GB. Moved off-box to a free tier, it competes for nothing and cannot OOM the app — which is better than the in-process design on its own merits, budget aside.

The guardrails are the real content here. Django's defaults were doing quiet work: a view without a decorator is at least a thing you wrote, a template renders server-side, and the ORM hands back `Decimal`. Next.js makes each of those an active choice, and three of them — G1, G2, G3 — map directly onto commitments this project has already made about expense privacy, cost confidentiality, and money integrity. **Writing them down now is cheaper than discovering them in review**, and G4 in particular would otherwise have surfaced as a field engineer unable to upload a receipt.

## Consequences

- **Roughly four admin screens to hand-build** — a generic picklist editor (one screen for all seven kinds, thanks to the single `picklist` table), `company` settings, `note_snippet`, users. A few days ([ADR-0041](0041-nextjs-feasibility.md)).
- **New deliverables:** the CI build pipeline, and a Data Access Layer that is the only module permitted to import restricted tables.
- **`provision.sh` and `RUNBOOK.md` are unchanged as commitments** but change in content — Node and systemd instead of a virtualenv and Gunicorn, plus G6's two variables and G7's patch entry.
- The PDF prototype is **still the first task, and still WeasyPrint** ([ADR-0041](0041-nextjs-feasibility.md)). It now produces the service rather than a module — the ten-item checklist is unchanged.
- **Testing priority 1 becomes an integration test** across the service boundary. Priority 4 gains the `decimal.js` discipline. A new priority covers G2: assert cost and other users' expenses are absent from rendered HTML, not just from the PDF.
- Memory: ~580–630 MB steady against ~550 MB for Django, revised in [`04-infrastructure.md`](../04-infrastructure.md). Swap stays non-optional.
- **`next build` never runs on the droplet.** If CI is unavailable, deployment stops — an accepted dependency, and the reason to keep the last known-good `standalone` artifact recoverable.
- Managed Postgres remains the highest-value budget upgrade ([ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.4). Unaffected.
- **The bus-factor problem is unchanged and still not technical** ([ADR-0036](0036-infrastructure-single-droplet.md) §11). Who else has the droplet, the domain, the GPG key — and now the CI secrets and the PDF service account.

## Revisit when

The PDF prototype completes, or the render service's cold start proves unacceptable in practice.
