# VCS CRM — Technology Stack

| | |
|---|---|
| **Status** | Draft v2.0 — **application layer rebaselined on Next.js**; PDF prototype pending |
| **Last updated** | 2026-08-11 |
| **Decision record** | [ADR-0041](decisions/0041-nextjs-feasibility.md), [ADR-0042](decisions/0042-nextjs-stack-choices.md) · PDF reasoning from [ADR-0035](decisions/0035-tech-stack-django-weasyprint.md) |
| **Constraints** | 1 GB RAM · 5,000 THB/year ([ADR-0036](decisions/0036-infrastructure-single-droplet.md)) · **single maintainer, TypeScript ecosystem** ([ADR-0042](decisions/0042-nextjs-stack-choices.md)) |

---

> **What changed in v2.0, and what did not.** The application framework is **Next.js**, confirmed by KK ([ADR-0042](decisions/0042-nextjs-stack-choices.md)). **The PDF half of this document is unchanged** — WeasyPrint remains the only renderer that meets all five layout requirements plus correct Thai inside 200 MB, and the Node alternatives were re-verified rather than assumed ([ADR-0041](decisions/0041-nextjs-feasibility.md)). WeasyPrint now runs as a small **off-box service** instead of an in-process module, which is better than the original design: it cannot OOM the droplet. Sections [2](#2-why-the-pdf-still-decides-its-own-stack)–[4](#4-pdf-generation-architecture) carry over; [6](#6-frontend--server-rendered)–[11](#11-dependencies) are rewritten.

## 1. The stack

| Layer | Choice | Version |
|---|---|---|
| Language | **TypeScript**, `strict: true` | 5.x |
| Framework | **Next.js**, App Router | 16.x |
| Runtime | Node.js | 22 LTS |
| Database | **PostgreSQL**, self-hosted | 16 |
| ORM / migrations | **Drizzle** | |
| Validation | **Zod** — at every action boundary | |
| Auth | **Better Auth** — email + password, Argon2id | |
| **PDF** | **WeasyPrint** + libthai + Sarabun, **as a service** | 62+ |
| Money | **`decimal.js`** over `NUMERIC`-as-string | |
| Web server / TLS | **Caddy** — automatic Let's Encrypt | 2.x |
| Process manager | **systemd** | |
| Build | **GitHub Actions** → `.next/standalone` | |
| Background jobs | **cron → authenticated route handler** | |
| Email | Resend or Brevo, free tier, **API not SMTP** | |
| Files | Local disk, authenticated route | |

**No Docker on the droplet, no SPA, no Redis, no queue.** Each omission is a memory decision.

**Two bans, both about money and both easy to get wrong:** `mode: 'number'` on any `NUMERIC` column ([§5.3](#53-g3--numeric-is-a-string-and-the-convenient-fix-destroys-money)), and Vercel — Hobby forbids commercial use, Pro is 1.6× the entire budget.

## 2. Why the PDF still decides its own stack

The CRM half of this system imposes no meaningful technical requirement — CRUD over nineteen tables for five users works in any framework. The quotation PDF does, and it is the component where a wrong choice is expensive to reverse.

### The requirement

From the samples and the client's Part A ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)): repeating table headers on every page, rows that do not split, `Page x/y` numbering, the quotation number repeated on each page, embedded per-line images, a totals block that stays with its terms, and **bilingual Thai/English text**.

### What that excludes

| Approach | Memory / render | Verdict |
|---|---|---|
| Headless Chrome — Puppeteer, Playwright, Gotenberg | **400–700 MB** | ❌ **Excluded.** Will OOM alongside Postgres on 1 GB |
| **WeasyPrint** | **100–200 MB** | ✅ **Chosen** |
| `@react-pdf/renderer` | Low | ❌ Open Thai-character issue; complex-script support historically neglected — a third party shipped the RTL fix in 2026 for breakage dating to 2019 |
| `pdfmake` / `PDFKit` | Low | ❌ Thai packages are **font-embedding** workarounds, not shaping. Page breaks, repeating headers, `Page x/y` all hand-coded |
| `harfbuzzjs` + `Intl.Segmenter` + PDFKit | Low | ❌ The two text pieces exist — **there is no layout engine to consume them.** This is hand-building text layout, then page breaks on top |
| ReportLab / low-level libraries | Low | ❌ Weeks of work for what CSS gives free |
| LibreOffice headless | 300–500 MB, slow | ❌ Marginal memory, poor layout control |

> **The most important line in this document:** the default answer to HTML-to-PDF — headless Chrome — is unavailable here. Anyone joining this project will reach for Puppeteer. The memory arithmetic is why they should not.

**Node has the Thai text primitives and no layout engine.** That is the whole reason the renderer stays Python ([ADR-0041](decisions/0041-nextjs-feasibility.md)).

### How WeasyPrint meets each requirement

| Requirement | Mechanism |
|---|---|
| Repeating table header | `<thead>` repeats natively across pages |
| Rows that do not split | `page-break-inside: avoid` on `<tr>` |
| `Page 1/3` | `@page` margin box, `counter(page)` / `counter(pages)` |
| Quotation number on every page | `string-set: quo content()` + `content: string(quo)` |
| Per-line images | Standard `<img>` |
| Totals travel with terms | Wrap both in one `page-break-inside: avoid` block |
| Thai glyph shaping | Pango + HarfBuzz — correct tone and vowel mark positioning |
| Thai word breaking | **libthai** — Thai has no spaces ([§3.1](#31-install-libthai)) |

```css
@page {
  size: A4;
  margin: 18mm 14mm 20mm 14mm;
  @top-right   { content: "QUO" string(quo-no); font-size: 8pt; }
  @bottom-right{ content: "Page " counter(page) "/" counter(pages); font-size: 8pt; }
}
thead { display: table-header-group; }          /* repeats */
tfoot { display: table-footer-group; }
tr    { page-break-inside: avoid; }             /* lines don't split */
.terms-and-totals { page-break-inside: avoid; } /* travel together */
```

## 3. Thai rendering — three non-negotiables

The most likely small mistake with the largest visible consequence. **Unchanged from v1.0.**

### 3.1 Install `libthai`

Thai has **no spaces between words**. Without libthai, the renderer breaks lines mid-word — and it does so *silently*, producing subtly wrong output on a document sent to customers rather than an error anyone notices.

```bash
apt-get install -y libthai0 libthai-dev
```

Pango uses it automatically once present. One line, easy to miss.

### 3.2 Sarabun, embedded

**Sarabun** — the Thai government standard document font. Free, and includes matching Latin glyphs, so the bilingual layout stays visually coherent rather than mixing two typefaces. Noto Sans Thai is the fallback.

### 3.3 Prototype before committing

**This is still the first task, before any CRM screen** ([ADR-0042](decisions/0042-nextjs-stack-choices.md)). Render a three-page bilingual quotation using the real Thai labels from the samples — `ใบเสนอราคา`, `จำนวนสั่งซื้อขั้นต่ำ`, `ภาษีมูลค่าเพิ่ม`, `จำนวนเงินทั้งสิ้น` — and verify:

- [ ] Thai renders as glyphs, not boxes
- [ ] Tone and vowel marks sit correctly above and below the baseline
- [ ] **Lines do not break mid-word** in Thai text
- [ ] `<thead>` repeats on pages 2 and 3
- [ ] No line item splits across a page boundary
- [ ] `Page 1/3` is correct — `counter(pages)` resolves
- [ ] Quotation number appears in the header of every page
- [ ] A per-line image renders at the right size
- [ ] Terms + totals stay together, and move to a fresh page if they will not fit
- [ ] Peak memory stays under ~250 MB
- [ ] Render completes in a few seconds

Half a day. **It is not wasted under any framework choice** — under Next.js the prototype simply becomes the render service.

## 4. PDF generation architecture

### 4.1 An off-box service, concurrency 1

WeasyPrint runs in a container on a free-tier serverless platform (Cloud Run, Fly.io, Render), invoked a handful of times a day.

| Property | Mechanism |
|---|---|
| No concurrent renders | **Platform concurrency setting = 1.** The v1.0 in-process semaphore becomes configuration |
| Cannot OOM the droplet | It is not on the droplet — **strictly better than the original design** |
| Cost | $0 at this volume |
| Latency | Cold start of a few seconds, acceptable for someone who just clicked Export |

> **⚠️ The service must authenticate.** A render endpoint accepting arbitrary HTML from the internet is an SSRF and content-injection hazard. Shared secret minimum; not reachable without it.

If cold start proves annoying in practice, the fallback is a small always-on container — **not** moving the renderer back on-box.

### 4.2 The cost-leak whitelist

The highest-severity constraint in the build. The client calls a cost column on a client-facing quotation "a serious commercial problem" and specifies the mitigation: **print from an approved field whitelist, not by hiding columns** ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)).

```ts
// lib/pdf/context.ts — the ONLY path to the render service.
// Returns plain UI-shaped objects, never database rows, so a template
// referencing unit_cost has nothing to resolve.
export function buildQuotationPdfContext(q: QuotationWithLines): PdfContext {
  return {
    company:   pick(company, PDF_COMPANY_FIELDS),
    quotation: pick(q,       PDF_QUOTATION_FIELDS),
    lines: q.lines
      .sort((a, b) => a.sequence - b.sequence)
      .map(l => pick(l, PDF_LINE_FIELDS)),
  }
}
```

Field lists are in [`02-data-model.md`](02-data-model.md) §10.

**Three properties make this safe:**

1. The context is built from an **explicit allowlist**, so cost fields are never in the payload.
2. One function is the only path to the service.
3. **An automated test is the actual guarantee** — and it is now an *integration* test, because the payload crosses a network boundary:

```ts
test('cost never appears in a rendered PDF', async () => {
  const q = await makeQuotation({ unitCost: '123456.78', totalCost: '987654.32' })
  const text = await extractText(await renderQuotationPdf(q))
  for (const s of ['123456', '123,456', '987654', '987,654'])
    expect(text).not.toContain(s)
})
```

The whitelist is how that test keeps passing. The failure mode becomes "renders blank", not "leaks silently".

### 4.3 Preview uses the real renderer

Preview renders the actual PDF through the actual service, not an HTML approximation. A preview that differs from the output is worse than no preview — particularly when the thing being checked is that cost is absent.

## 5. The seven guardrails

Django provided these by default. Next.js makes each an active choice, and three map directly onto commitments this project has already made. Full reasoning in [ADR-0042](decisions/0042-nextjs-stack-choices.md).

### 5.1 G1 — every Server Action is a public POST endpoint

Next.js is explicit: the route is reachable by anyone who can send the POST, and **render-time gating is not a security boundary.** Their own sharper warning is the one that bites here:

> *Schema validation only checks the **shape** of the input. A well-formed object can still refer to a row the caller does not own.*

That is precisely the expense rule from [ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md) — `{expenseId: 42}` is well-formed and may be someone else's.

**Authenticate → authorize → validate, in that order. Take an ID plus the change, never a client-supplied object, and re-read scoped by session.**

```ts
export async function updateExpenseNote(expenseId: number, note: string) {
  const session = await requireSession()
  const parsed  = NoteSchema.parse(note)
  const rows = await db.update(expenses).set({ note: parsed })
    .where(and(eq(expenses.id, expenseId),
               eq(expenses.incurredByUserId, session.userId)))   // ← the boundary
    .returning()
  if (!rows.length) return notFound()   // not "forbidden" — don't confirm it exists
}
```

**A Data Access Layer enforces this.** Drizzle has no default-manager equivalent, so `lib/data/expenses.ts` is the only module permitted to import the `expenses` table, and it exports no unscoped query.

### 5.2 G2 — unused props still ship to the browser

**A prop passed to a Client Component is serialized into the page even if unused.** A US government site leaked grant IDs exactly this way. This vector did not exist with server-rendered templates.

| At risk | How it leaks |
|---|---|
| Another user's expenses ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) | A list component given full rows ships every field, including rows filtered out client-side |
| Cost and margin ([ADR-0031](decisions/0031-quotation-template-and-numbering.md)) | Passing a whole line to a client component puts `unit_cost` in the HTML of pages that never show it |

Server Components by default · **pass fields, not objects** · DTOs at the data layer · `taintObjectReference` on cost and expense rows so a mistake throws.

### 5.3 G3 — `NUMERIC` is a string, and the convenient fix destroys money

Drizzle returns `numeric` as a **string**, deliberately. It offers `mode: 'number'`, which converts to a float.

> **`mode: 'number'` is banned on every money column.** This is a quotation system; `0.1 + 0.2 !== 0.3` reaching a customer total is among the worst outcomes available.

Money stays a string from the database, enters `decimal.js` for arithmetic, and is formatted for display. **Never `parseFloat`, never `Number()`, never arithmetic on the raw string.** The convention in [`02-data-model.md`](02-data-model.md) §1 was a schema instruction under Django; it is now an application discipline, and [§9](#9-testing-priorities) test 4 is what enforces it.

### 5.4 G4 — the 1 MB body limit versus a 4 MB phone photo

Server Action requests cap at **1 MB by default.** Product images and receipt photos ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md)) are routinely 3–5 MB, and the failure would land on an engineer in the field, one-handed, in the sun ([ADR-0038](decisions/0038-responsive-web-desktop-first.md)).

**Uploads go through a Route Handler, not a Server Action** — own auth check, size cap, MIME allowlist, resize on arrival. `serverActions.bodySizeLimit` stays at its default so an oversized payload anywhere else fails loudly.

### 5.5 G5 — caching is a liability here

No public pages, five users, every figure must be current. A cached total or a stale stage is a defect, and route-level caching of authenticated pages risks serving one user's data to another.

**Authenticated routes render dynamically. No `revalidate` on data reads. Nothing user-scoped is cached.**

### 5.6 G6 — two variables that break things quietly

| Variable | If wrong |
|---|---|
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Must be **set and stable across restarts and deploys.** Unset means regenerated, and actions fail after a restart in ways that look random |
| Action IDs rotate on deploy | Rotated at least every 14 days even with unchanged source. A user on the old build gets **"Failed to find Server Action"** |

Both belong in `provision.sh` and the runbook. The second must surface as a **retry**, so a refresh recovers the user rather than losing their draft quotation.

### 5.7 G7 — patch cadence is now operational

**CVE-2025-55182 ("React2Shell")** was an RCE in RSC Flight payload deserialization, exploited in the wild. Not a reason to avoid the stack; an honest cost of it — RSC is a more actively targeted surface than a Django app behind Caddy, and the vulnerable path is the framework core.

Security releases are applied promptly, not batched with features. Dependabot on from day one. The runbook gains a sixth entry: *a security release is out*.

## 6. Frontend — server-rendered

**Server Components by default; `'use client'` is a deliberate act.** No SPA, no separate API layer, no client-side store.

This is the same architecture as v1.0's Django-templates-plus-HTMX, reached differently: the server owns rendering and the client gets progressive enhancement where it earns its place.

| Interaction | Mechanism |
|---|---|
| Item autocomplete | Route Handler + debounced client fetch |
| Add / remove quotation line | Server Action → `updateTag` re-renders the line table in the same roundtrip |
| Live margin recalculation | Client component, `decimal.js`; **server authoritative on save** |
| Progress stepper | Server Action, optimistic UI via `useOptimistic` |
| Inline account creation | Server Action in a dialog, returns the new option |
| Image / receipt upload | **Route Handler** ([§5.4](#54-g4--the-1-mb-body-limit-versus-a-4-mb-phone-photo)) |

**Margin display is computed client-side for responsiveness and recomputed server-side on save.** The server value is authoritative — the browser number is a convenience, and the two must agree by using the same rounding rules **and the same decimal library**.

## 7. Application structure

```
src/
├── app/
│   ├── (auth)/                sign-in, password reset
│   ├── (app)/                 authenticated shell
│   │   ├── tasks/             Flow A — landing page
│   │   ├── projects/[id]/
│   │   ├── quotations/[id]/   the builder — Flow C
│   │   ├── accounts/[id]/
│   │   ├── expenses/          restricted ([ADR-0039](decisions/0039-minimal-expense-capture-reinstated.md))
│   │   ├── reports/
│   │   └── admin/             4 hand-built screens (§7.2)
│   └── api/
│       ├── upload/            Route Handler — images, receipts (G4)
│       ├── media/[...path]/   authenticated file serving
│       └── cron/followups/    bearer-token, called by system cron
├── lib/
│   ├── data/                  ← the Data Access Layer. Only importer of restricted tables
│   │   └── expenses.ts        no unscoped query exported (G1)
│   ├── pdf/
│   │   ├── context.ts         ← the whitelist. Only path to the render service
│   │   └── client.ts          authenticated call to the service
│   ├── quotations/
│   │   ├── numbering.ts       ← the only allocator of quotation numbers
│   │   └── totals.ts          decimal.js arithmetic (G3)
│   ├── auth.ts                Better Auth
│   └── money.ts               string ↔ Decimal ↔ display. The only place
├── db/
│   ├── schema.ts              Drizzle — mirrors 02-data-model.md
│   └── migrations/
└── pdf-service/               WeasyPrint container — deployed separately
    ├── Dockerfile             libthai, Sarabun, WeasyPrint
    └── templates/quotation.html
```

**Four things live in exactly one place, and it matters:**

- **`lib/pdf/context.ts`** — the only path from data to PDF ([§4.2](#42-the-cost-leak-whitelist)).
- **`lib/quotations/numbering.ts`** — the only allocator of quotation numbers ([`02-data-model.md`](02-data-model.md) §6.5).
- **`lib/money.ts`** — the only place money is parsed or formatted ([§5.3](#53-g3--numeric-is-a-string-and-the-convenient-fix-destroys-money)).
- **`lib/data/expenses.ts`** — the only module that may query expenses ([§5.1](#51-g1--every-server-action-is-a-public-post-endpoint)).

### 7.1 The PDF service is a black box, by design

Everything genuinely unfamiliar — Pango, libthai, font embedding, `@page` CSS, page-break control — lives in `pdf-service/` and nothing else imports it. It is:

- **Written once, during the prototype** ([§3.3](#33-prototype-before-committing)), before any CRM screen exists
- Small: accept a JSON context, render a template, return bytes
- Covered by the sentinel cost-leak test, so a change that breaks it fails loudly
- **Never touched during normal feature work.** Adding a field to a screen does not go near it

A black box does not care what language it is written in — which is exactly why the framework could change and the renderer could not ([ADR-0041](decisions/0041-nextjs-feasibility.md)).

### 7.2 Four admin screens, hand-built

Django's admin would have given these free; that saving is smaller than earlier records claimed, because [`02-data-model.md`](02-data-model.md) §3.2 uses **one `picklist` table with a `kind` column, not seven tables**:

| Screen | Covers |
|---|---|
| Picklist editor | All seven kinds — Incoterm, Unit, Country, DocumentType, TaskType, LeadSource, LostReason |
| Company settings | Singleton form ([`02-data-model.md`](02-data-model.md) §3.1) |
| Note snippets | Reusable paragraphs |
| Users | Create, deactivate, role, `phone_mobile` |

A few days, not the week implied by [ADR-0035](decisions/0035-tech-stack-django-weasyprint.md).

## 8. Memory budget

| Component | Budget |
|---|---|
| PostgreSQL, tuned small | ~200 MB |
| Next.js standalone server | ~150–250 MB |
| OS, Caddy, cron | ~100 MB |
| **Steady state** | **≈ 450–550 MB** |
| **Swap** | **2 GB** |

**The PDF renderer no longer appears in this table** — it is off-box, so the 200 MB transient spike that drove the v1.0 semaphore is gone from the droplet entirely.

```ini
# postgresql.conf — 1 GB machine
shared_buffers = 128MB
effective_cache_size = 512MB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 20
```

> **⚠️ `next build` will not fit on the droplet** and must not be attempted there. Build in CI, deploy the `.next/standalone` output ([§10](#10-deployment)).
>
> **Node's footprint grows toward its maximum.** Next.js preloads page modules and does not unload them, so the figure above is the eventual steady state, not the warm-up. Budget for the ceiling.

**Connection pooling:** keep the pool small — `max: 5`. Postgres is capped at 20 connections and a single Node process does not need more.

## 9. Testing priorities

Ordered by consequence, not coverage.

| Priority | Test |
|---|---|
| **1** | **Cost never appears in a rendered PDF** — sentinel values, extracted text. Now an **integration** test across the service boundary ([§4.2](#42-the-cost-leak-whitelist)) |
| **2** | Thai renders correctly, no mid-word breaks, three-page layout holds |
| **3** | **Cost and other users' expenses never appear in rendered HTML** — assert against the RSC payload, not just the DOM ([§5.2](#52-g2--unused-props-still-ship-to-the-browser)) |
| **4** | **Money arithmetic via `decimal.js`** — line and document totals, percent discounts, FX-converted cost. No float anywhere ([§5.3](#53-g3--numeric-is-a-string-and-the-convenient-fix-destroys-money)) |
| **5** | Quotation number allocation under concurrency — no duplicates |
| **6** | **Every Server Action rejects an unauthenticated and an unauthorised caller** — called directly, not through the UI ([§5.1](#51-g1--every-server-action-is-a-public-post-endpoint)) |
| **7** | `generate_followup_tasks` is idempotent — running twice creates one task |
| **8** | `ProjectHistory` is written on every progress and status change, including backwards |
| **9** | Client snapshot **and FX rate** frozen at issue — editing the account or the rate does not change a reissued PDF or its recorded margin |
| **10** | **Expense visibility** — a non-manager cannot read another user's expense row, total, or receipt image, via view, action, or export |
| **11** | Issued quotations cannot be edited |
| **12** | A 4 MB photo uploads successfully ([§5.4](#54-g4--the-1-mb-body-limit-versus-a-4-mb-phone-photo)) |

Tests 1–4 are the ones whose absence would let a real commercial problem reach a customer. **Tests 3, 6 and 12 are new and exist only because the framework changed.**

## 10. Deployment

```
GitHub Actions                          Droplet
─────────────                           ───────
typecheck, lint, test
next build              ──────────────▶ rsync .next/standalone
                                        drizzle-kit migrate
                                        systemctl restart crm
```

**`next build` runs in CI, never on the droplet** ([§8](#8-memory-budget)). Caddy fronts Node on a unix socket, terminates TLS automatically, and serves `/_next/static/` directly.

The PDF service deploys separately and rarely — it changes only when the quotation template changes.

> **Keep the last known-good `standalone` artifact recoverable.** If CI is unavailable, deployment stops; that is an accepted dependency, not one to discover during an incident.

## 11. Background jobs — cron, not a queue

Recurring reorder follow-up tasks ([ADR-0029](decisions/0029-project-types-and-repeat-orders.md)) are the only background work in Phase 1. A queue would add Redis (50–100 MB) plus a worker to a machine with no memory to spare, **to run one job per day.**

```cron
15 1 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
              http://127.0.0.1:3000/api/cron/followups >> /var/log/crm/cron.log 2>&1
30 2 * * *  /usr/local/bin/backup-db.sh
```

A route handler rather than a separate script, so there is **one build target and one set of database code** — not a second entry point to keep in sync.

**Two rules:**

- **Bearer token, and bind-checked.** An unauthenticated job endpoint is a public write.
- **Idempotency matters more than scheduling precision.** cron can miss a run or fire twice, so the handler must be safe to run repeatedly — the "one open auto-task at a time" rule is what stops a paused-then-resumed project generating a backlog of overdue chases ([ADR-0029](decisions/0029-project-types-and-repeat-orders.md)).

## 12. Dependencies

```jsonc
// package.json — the shape
{
  "next": "16.x",  "react": "19.x",
  "drizzle-orm": "*", "drizzle-kit": "*", "pg": "*",
  "better-auth": "*", "@node-rs/argon2": "*",
  "zod": "*",
  "decimal.js": "*",                  // G3 — money. Not optional
  "sharp": "*",                       // resize on upload
  "date-fns": "*", "date-fns-tz": "*", // Asia/Bangkok display, UTC storage
  "resend": "*"
}
```

**PDF service** (`pdf-service/`, Python — the only Python in the project):

```
weasyprint==62.*
```

System packages in its container: `libthai0 libthai-dev libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 libffi-dev fonts-sarabun`

**Not used:** a Thai NLP or segmentation package. Thai line breaking is libthai's job at the Pango layer, inside the service.

## 13. Open items

| # | Item | Impact |
|---|---|---|
| **P1** | **Run the PDF prototype** ([§3.3](#33-prototype-before-committing)) | Still the first task |
| **P2** | **Choose the PDF service host** — Cloud Run / Fly.io / Render free tier. **Cannot be Vercel** — WeasyPrint needs Pango, Cairo and libthai as system libraries ([ADR-0043](decisions/0043-prototype-environment.md)) | Affects cold start and the deploy path |
| **B1** | A multi-line quotation sample | Cannot validate page breaks without it |
| **B3** | Discount format — amount or percent | Line arithmetic |
| ~~N1~~ | ✅ Resolved — responsive web, desktop-first ([ADR-0038](decisions/0038-responsive-web-desktop-first.md)) | Responsive from the first screen, not retrofitted |
| N5 | Due-date reminders — in-app or email | Whether a second cron entry and email templates are needed |
| N10 | Broader audit logging | `created_by`/`updated_by` is the current floor |

---

*Next: [`04-infrastructure.md`](04-infrastructure.md)*
