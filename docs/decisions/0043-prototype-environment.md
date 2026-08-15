# ADR-0043: Prototype on managed platforms — but treat them as dumb infrastructure

- **Status:** ⚠️ **Superseded by [ADR-0044](0044-local-development-droplet-deployment.md)** — KK aborted the managed-platform approach, 2026-08-11
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Technology / Process
- **Constrained by:** [ADR-0036](0036-infrastructure-single-droplet.md), [ADR-0041](0041-nextjs-feasibility.md)

> **Superseded the same day.** KK aborted Vercel + Supabase in favour of local Docker development and droplet deployment ([ADR-0044](0044-local-development-droplet-deployment.md)). This record is kept because two of its findings outlived it: **WeasyPrint cannot run on Vercel** (system libraries), and **the RLS-versus-Data-Access-Layer question is a PostgreSQL question, not a Supabase one** — it survives unchanged. The rest is historical.

## Context

KK intended to build and test Phase 1 on **Vercel + Supabase** before deploying to the droplet.

This is a sound instinct — a clickable prototype in front of the client early is worth a lot, and it removes infrastructure work from the critical path while the product is still moving. But it introduces a risk the project has not previously faced, because every prior hosting decision assumed a single destination.

**The migration to the droplet is certain, not hypothetical.** Vercel's documentation states the Hobby plan "restricts users to non-commercial, personal use only", and Pro at $20/month is 1.6× the entire annual budget ([ADR-0036](0036-infrastructure-single-droplet.md), [ADR-0041](0041-nextjs-feasibility.md)). Vercel therefore cannot host a client's commercial CRM under this budget. Whatever gets built on Vercel-specific or Supabase-specific foundations gets unbuilt later.

## Options considered

1. **Skip the managed platforms** — local `next dev` plus Postgres in Docker, then straight to the droplet.
   - Pro: no migration, no licensing question, no divergence. Costs nothing.
   - Con: nothing to show the client from a URL, and infrastructure work lands earlier than it needs to.
2. **Use the platforms fully** — Supabase Auth, Storage and RLS; Vercel Blob and Cron.
   - Pro: fastest to a working prototype. These products are good.
   - Con: **the migration becomes a rewrite of auth, file handling and scheduling** — precisely the parts that are tedious and security-sensitive to redo.
3. **Use the platforms as dumb infrastructure** — Supabase as a plain PostgreSQL, Vercel as a plain Node host.
   - Pro: keeps the early-demo benefit; migration is a connection string and a systemd unit.
   - Con: forgoes genuinely nice features, and requires discipline exactly when the temptation is highest.

## Decision

**Option 3.**

> **Supabase is a PostgreSQL. Vercel is a Node host. Nothing else from either.**

### Explicitly not used

| Tempting | Use instead | Why |
|---|---|---|
| Supabase Auth | **Better Auth** ([ADR-0042](0042-nextjs-stack-choices.md)) | Auth migration is the worst kind: security-sensitive, and every user's credentials live inside it |
| Supabase Storage | **Local disk + authenticated route handler** | [`04-infrastructure.md`](../04-infrastructure.md) §6. Receipts and product images must be behind an auth check either way |
| Supabase Realtime, Edge Functions | — | No droplet equivalent; Phase 1 needs neither |
| Vercel Blob / KV | — | Same |
| Vercel Cron | **system cron → authenticated route handler** | [`03-tech-stack.md`](../03-tech-stack.md) §11. The route handler works identically in both environments |
| Vercel image optimisation | **`sharp`, resize on upload** | Already required for disk reasons ([ADR-0036](0036-infrastructure-single-droplet.md)) |

### Postgres RLS is the one genuine judgement call

Row-level security is a **PostgreSQL** feature, not a Supabase one, so unlike the rest of that list it *is* portable to the droplet. It is also a legitimately strong way to enforce the expense visibility rule ([ADR-0039](0039-minimal-expense-capture-reinstated.md)) — arguably stronger than a Data Access Layer, because the database refuses rather than trusting every call site.

The cost is that RLS needs per-request session context (`SET LOCAL`), which interacts awkwardly with connection pooling in transaction mode — the exact mode Supabase's pooler runs.

**[ADR-0042](0042-nextjs-stack-choices.md) G1 specifies a Data Access Layer, and that stands unless deliberately revisited.** What must not happen is drifting between the two — relying on RLS on Supabase, on the DAL later, and ending up with the rule properly enforced in neither. **Pick one and write it down.**

### Three environment differences to expect

| | Prototype | Droplet |
|---|---|---|
| **Connection** | Supavisor transaction pooler — **prepared statements unavailable**, Drizzle needs `{ prepare: false }` | Direct connection, prepared statements work, small pool (`max: 5`) |
| **PDF service** | **Cannot be Vercel** — WeasyPrint needs Pango, Cairo and libthai as *system* libraries, and a serverless Python runtime cannot install them. Cloud Run / Fly.io / Render / laptop | Same off-box service ([ADR-0042](0042-nextjs-stack-choices.md)) |
| **Idle behaviour** | **Supabase free pauses after 7 days** of database inactivity; manual unpause | Always on |

**The PDF difference is the useful one:** because WeasyPrint can never live inside the Next.js deployment, **the prototype's architecture is identical to production's for the highest-risk component.** The thing most worth testing is the thing that does not change.

### What the prototype does not test

Naming this so it is not mistaken for coverage: the 1 GB memory ceiling shared with Postgres, `next build` not fitting on the droplet, swap behaviour, Caddy and TLS, systemd, `pg_dump` and offsite backup, restore rehearsal, and single-point-of-failure recovery. **Every operational risk in [ADR-0036](0036-infrastructure-single-droplet.md) is untested by a managed platform.**

Mitigation: the droplet is $6/month with per-second billing. It can be stood up, tested against, and destroyed for pennies — **that**, not Vercel, is the staging environment for deployment questions.

## Rationale

The value of a managed prototype is real and specific: a URL to show the client, and infrastructure deferred while the product is still changing shape. Neither requires adopting the platforms' proprietary surface, and adopting it buys convenience during the phase when the code is most in flux and pays for it during migration, when it is least welcome.

The discipline is easier than it sounds because the alternatives were already decided for other reasons — Better Auth, local disk behind an authenticated route, cron hitting a route handler, `sharp` on upload. **The rule is not "give things up", it is "build what you already decided to build."** The temptation is only strong in the moment.

Naming RLS separately matters because it is the one item where the platform feature is genuinely portable and arguably better. Lumping it in with Supabase Auth would be lazy analysis, and the real hazard there is not choosing wrong — it is choosing neither.

## Consequences

- The prototype runs against Supabase with `{ prepare: false }`. **Test on the droplet before launch with prepared statements enabled** — this is the one place the two environments genuinely diverge at runtime.
- **The PDF service host must be chosen before the prototype is useful** (open item **P2**). It cannot be Vercel.
- Migration is: point `DATABASE_URL` at the droplet's Postgres, `drizzle-kit migrate`, copy media, deploy the standalone build under systemd. **A day, if this record is followed.**
- If Vercel Hobby's non-commercial restriction is a concern, **local `next dev` plus Postgres in Docker tests the same things**, costs nothing, and raises no licensing question. The only thing lost is the shareable URL.
- Supabase's 7-day idle pause will eventually bite. Not worth automating around for a prototype — just know why it is down.
- **Supabase's free tier permits commercial use; Vercel's does not.** The two halves of this plan sit differently, and only one of them needs a decision from KK.

## Revisit when

The droplet is provisioned, or the client asks for a permanent hosted demo — the second would make Vercel Pro a budget conversation rather than a licensing one.
