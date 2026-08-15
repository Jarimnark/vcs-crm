# ADR-0044: Develop locally in Docker, deploy to the droplet. No managed platforms.

- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** KK
- **Phase:** Technology / Process
- **Supersedes:** [ADR-0043](0043-prototype-environment.md)

## Context

[ADR-0043](0043-prototype-environment.md) accepted a Vercel + Supabase prototype under a strict "treat them as dumb infrastructure" rule. KK has since aborted that approach: **droplet only.**

The question that prompted it — *can I test on my machine, or do I need to register a droplet first?* — has a clean answer that makes the managed platforms unnecessary rather than merely restricted.

## Decision

**Development is entirely local. The droplet is required only to deploy.**

| | Local development | Droplet |
|---|---|---|
| Next.js | `next dev` | `.next/standalone` under systemd |
| PostgreSQL 16 | Docker container | Native, tuned for 1 GB |
| WeasyPrint service | **Docker container — the same image that deploys** | Off-box free tier, or on-box if preferred |
| TLS | none, `http://localhost:3000` | Caddy, automatic |
| Cost | **$0** | ~$8.20/mo ([ADR-0036](0036-infrastructure-single-droplet.md)) |
| Registration needed | **None** | DigitalOcean, domain, email provider, backup store |

**Nothing needs to be registered, purchased, or signed up for to build and test the entire application.** A laptop with Node 22 and Docker covers every Phase 1 feature including the PDF.

### The one rule that matters

> **Run the PDF prototype inside the Linux container you intend to deploy — never natively on macOS or Windows.**

This is not general tidiness. The prototype's whole purpose is proving that **libthai** is present and doing Thai word breaking ([`03-tech-stack.md`](../03-tech-stack.md) §3.1). A native macOS install of Pango may not link libthai at all, and macOS's own text stack may handle Thai correctly by a different route — so a native run can produce **a passing result that means nothing, or a failure that is not real.** Either way the test tells you about your laptop rather than about the server.

Docker makes the test honest: the same image, the same libraries, the same fonts.

### What still cannot be tested locally

Naming these so "it works locally" is not mistaken for readiness:

- **The 1 GB memory ceiling** shared with Postgres. A laptop has far more.
- **`next build` not fitting on the droplet** — it will build fine locally.
- Swap behaviour, Caddy, TLS, systemd, `pg_dump` to offsite storage, **restore rehearsal**, single-point-of-failure recovery.
- Latency from Bangkok.

Every operational risk in [ADR-0036](0036-infrastructure-single-droplet.md) is invisible to local development. The mitigation is unchanged and cheap: the droplet is $6/month with per-second billing, so it can be created, tested against, and destroyed for pennies once there is something to deploy.

## Rationale

[ADR-0043](0043-prototype-environment.md) was solving for a benefit KK has now declined — a shareable URL for early client demos. Without that requirement, the managed platforms offer nothing this project needs and cost three things: a licensing question on Vercel Hobby, a certain migration, and a standing temptation to build on features the droplet lacks.

Local Docker is strictly better on every remaining axis. It is free, raises no licensing question, needs no migration, and — because the PDF service is a container in both places — **it reproduces the highest-risk component exactly** rather than approximately. Supabase's transaction pooler would have forced `{ prepare: false }`, a behavioural difference from the droplet's direct connection that now simply disappears.

The sequencing improves too. [ADR-0043](0043-prototype-environment.md) put account registration and platform decisions before the first line of code. This puts them after the application works, which is the right order: **infrastructure is the last problem, not the first.**

## Consequences

- **Nothing blocks starting.** No accounts, no credit card, no droplet. Node 22 + Docker + the repository.
- `docker-compose.yml` covering Postgres and the PDF service becomes a **deliverable**, alongside `provision.sh` and `RUNBOOK.md` ([ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.3).
- The PDF service's `Dockerfile` is written during the prototype and is then **used unchanged in development, in CI, and in production.** One artifact, three environments.
- Open item **P2** — where the PDF service is hosted — is **deferred, not urgent.** It runs locally in Docker until deployment day, and the decision no longer gates any work.
- Deployment-day tasks are concentrated rather than spread out, so they need a checklist: [`06-manual-tasks.md`](../06-manual-tasks.md).
- **One item does need doing early despite being a launch concern:** transactional email domain verification has DNS propagation and provider review lead time, and password reset depends on it ([ADR-0036](0036-infrastructure-single-droplet.md)). Start it well before it is needed.
- Prepared statements work normally in both environments now — the [ADR-0043](0043-prototype-environment.md) divergence is gone.
- **The RLS-versus-Data-Access-Layer question survives** ([ADR-0042](0042-nextjs-stack-choices.md) G1, [ADR-0043](0043-prototype-environment.md)). It was never really about Supabase — RLS is a PostgreSQL feature. Still to be decided deliberately rather than drifted into.

## Revisit when

The client asks for a permanently hosted demo before launch — the only requirement this decision gives up.
