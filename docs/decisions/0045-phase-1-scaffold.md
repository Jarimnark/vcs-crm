# ADR-0045: The Phase 1 scaffold — implementation choices

- **Status:** Accepted
- **Date:** 2026-08-15
- **Deciders:** KK
- **Phase:** Implementation
- **Implements:** [ADR-0042](0042-nextjs-stack-choices.md), [ADR-0044](0044-local-development-droplet-deployment.md)

## Context

First code lands in the repository: the Next.js application skeleton, the
WeasyPrint render service, `docker-compose.yml`, and the CI pipeline. The
stack was decided in [ADR-0042](0042-nextjs-stack-choices.md); this record
covers only the choices the scaffold had to make that no prior record
pinned down.

## Decisions

### D1 — Data Access Layer, not Postgres RLS (closes open question V1)

[ADR-0042](0042-nextjs-stack-choices.md) G1 specified a DAL;
[ADR-0043](0043-prototype-environment.md) kept RLS open as the one genuinely
portable alternative and warned against drifting between the two. **The DAL
is now the deliberate choice.** `src/lib/data/expenses.ts` is the only module
that imports the `expenses` table, exports no unscoped query, and takes the
caller's session so the visibility rule ([ADR-0017](0017-expense-visibility-restriction.md))
lives in the WHERE clause. RLS would add per-request `SET LOCAL` session
context for no additional guarantee a five-user app needs. Revisit only if
the DAL discipline proves unenforceable in review.

### D2 — Vitest, and the sentinel test in two halves

Unit tests (money, totals, whitelist, numbering format) run with no
database. The cost-leak sentinel (testing priority 1) runs twice: as a unit
test against `buildQuotationPdfContext`, and as an integration test that
renders through the real container and asserts `pdftotext` output is clean —
because the whitelist now crosses a network boundary. CI runs both on every
push.

### D3 — Flask + gunicorn for the render service

~100 lines: shared-secret auth, one `/render` endpoint, Jinja2 → WeasyPrint.
gunicorn runs **one worker, one thread** — the ADR-0035 render semaphore as
deployment configuration. Jinja2 renders undefined variables as blank
deliberately: a template referencing `unit_cost` produces nothing, which is
the designed failure mode.

### D4 — Sarabun vendored into the repository

The Google-Fonts Sarabun TTFs (OFL) live in `pdf-service/fonts/` rather than
coming from a Debian package, so dev, CI and production render with
byte-identical fonts. `fonts-sarabun` also isn't reliably packaged, and a
font swap is exactly the kind of silent change the Thai-rendering checklist
exists to catch.

### D5 — WeasyPrint 62.3 with pydyf pinned to 0.10.0

WeasyPrint 62 crashes with pydyf ≥ 0.11 (`'super' object has no attribute
'transform'`). Found the hard way in the first container build. Upgrading
WeasyPrint is fine later; unpinning pydyf alone is not.

### D6 — Plain CSS, no UI framework

A sidebar, tables and forms for five users need no Tailwind or component
library, and every dependency is a G7 patch obligation. Reconsider when a
screen actually needs more.

### D7 — Known extraction quirk, recorded so it isn't rediscovered

`pdftotext` on shaped Sarabun output confuses SARA AA (า) with SARA AM (ำ)
and can break a trailing tone mark onto its own line. **This is a
text-extraction artifact, not a render defect** — verified visually against
the rendered pages. The integration test normalises both sides before
comparing Thai strings; the sentinel assertions are numeric and unaffected.

## What was verified before this landed

The ten-item prototype checklist ([`03-tech-stack.md`](../03-tech-stack.md)
§3.3) run against the real container: Thai glyphs and tone marks correct, no
mid-word breaks, `<thead>` repeating on pages 2–3, no row split across
pages, `Page x/y` and the quotation number on every page, terms + totals
travelling together, long header-bar values auto-replaced with "See below".
Still outstanding from the client: a real multi-line sample (B1) to compare
against, and the page-2 question (B2).

## Consequences

- `npm run typecheck && npm run lint && npm test` and `next build` all pass
  in CI; the standalone artifact is retained 30 days.
- The quotation counter is seeded at a **placeholder** (69000) —
  [B5] the real value must be seeded and hand-verified before launch.
- The quotation builder UI is deliberately thin until B3/B5/B6 are answered;
  the arithmetic, numbering and PDF path beneath it are built and tested.
- `provision.sh` and `RUNBOOK.md` remain owed at deployment time
  ([ADR-0037](0037-maintainer-capability-as-a-constraint.md) §3.3).

## Revisit when

The client answers B1–B7, or the first deployment to the droplet begins.
