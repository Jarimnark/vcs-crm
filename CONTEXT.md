# Build Context — living document

| | |
|---|---|
| **Purpose** | Running state of the implementation: what exists, how it diverges from the spec, what is blocked, what happens next. Updated every working session. |
| **Updated** | 2026-08-22 |
| **Status** | ⏸ **Awaiting KK review of the plan below. No code changes until approved.** |
| **Spec sources** | `user-story/` (client, authoritative) → `docs/00,01,03,05` → ADRs |

---

## 1. Why the implementation diverges from the spec — honest root cause

Three causes, in order of impact:

1. **Two design documents are missing from the repository.** `docs/02-data-model.md` (the table-by-table schema, "19 tables, every constraint, every index") and `docs/04-infrastructure.md` are referenced everywhere but are not in the repo. The implemented Drizzle schema was **reconstructed from ADR summaries**, not built from the real table design. The closest surviving source — `user-story/phase1-design-handoff.md` Part B (the full entity design) — was only skimmed during scaffolding. Most schema gaps below trace to this.
   → **Action needed from KK: do you still have 02/04 locally? Restoring them beats re-deriving.** Until then, this file treats handoff Part B + user-story §3 as the canonical schema.
2. **The scaffold was architecture-first, not feature-first.** The first push prioritized the guardrails (PDF whitelist + sentinel test, money discipline, DAL, CI, Docker) because those are the expensive-to-retrofit parts. Entity completeness and screens were deliberately thin — but that boundary was not written down clearly, so it reads as "huge difference" rather than "planned phase 1 of the build".
3. **A few outright misreads** (not simplifications) — listed in §2 marked ❌. These are bugs against the spec and need migration fixes.

---

## 2. Schema gap analysis — spec vs `src/db/schema.ts`

Severity: ❌ wrong (contradicts spec) · ⚠️ missing (spec field absent) · ✅ ok / deliberate.

### Account
| Spec (handoff B2 / user-story 3.1) | Implemented | Gap |
|---|---|---|
| `types[]` **multi-select**: client / supplier / manufacturer / service_provider / logistics | single enum `customer / principal / partner / other` | ❌ Wrong values AND wrong cardinality. ADR-0034 says an account plays **as many roles as it plays** |
| `industry`, `country`, `default_payment_term`, `owner_user`, `status` (active/inactive/prospect) | — | ⚠️ missing |
| `lead_source` | implemented **on account** | ❌ spec puts lead source **on Project**, not Account |
| name, tax_id, tax_branch, address, default_currency | ✅ | |

### Person
| Spec | Implemented | Gap |
|---|---|---|
| `department`, `line_id` (Line messaging — Thai clients live on Line), `is_primary`, `decision_role` (technical/commercial/decision_maker) | — | ⚠️ missing |
| name, position, email, phone, mobile, account | ✅ | |

### Project
| Spec | Implemented | Gap |
|---|---|---|
| `followup_interval_days` — **set by user per project**, drives the reorder loop | — ; cron uses a **hard-coded 90 days** | ❌ core mechanic wrong. Interval is per-project, prompted at Won |
| `followup_paused` — pause is first-class, distinct from "no interval" | — | ⚠️ missing |
| `parent_project` (Part → Equipment optional link; enables spare-part-revenue report) | — | ⚠️ missing |
| `primary_person`, `expected_close_date`, `lead_source`, `competitor` (asked at Lost) | — | ⚠️ missing |
| `project_no` (reference number) | — | ⚠️ open question N7 — awaiting answer, low cost to add |
| `quoted_value` (derived from latest issued quotation) | — | ⚠️ derived; needs a query/column decision |
| type, progress, status, lost_reason, expected_amount, currency, owner, history | ✅ | |

### Quotation
| Spec | Implemented | Gap |
|---|---|---|
| status: draft / issued / superseded / **accepted / expired** | draft / issued / superseded | ⚠️ two values missing |
| `vat_rate` stored (7 default, toggleable/zero-rated) | hard-coded `0.07` constant | ⚠️ should be stored per quotation |
| document-level `discount_total` (user-story 3.4 "Totals") | — | ⚠️ missing — related to open B3 |
| `remarks`, MOQ note, warranty note (equipment), scope note (service), withholding-tax note (service) | — | ⚠️ missing |
| `total_cost`, `total_margin` stored (internal) | computed only, not stored | ⚠️ needed for margin reports |
| number, revision, project FK, client snapshot, terms texts, fx_rate, cost_currency, cc, salesperson snapshot | ✅ | |

### QuotationLine / Component
| Spec | Implemented | Gap |
|---|---|---|
| `line_notes` | — | ⚠️ minor |
| everything else incl. components, image, discount type+value | ✅ | |

### Task
| Spec | Implemented | Gap |
|---|---|---|
| status enum: open / in_progress / done / cancelled | boolean `done` | ⚠️ loses "in progress" and "cancelled" |
| `description`, `recurrence_parent_task` (chain of auto follow-ups) | — | ⚠️ missing |
| type as picklist, due date, assignee, optional project/account/person, auto flag | ✅ | |

### Meeting — the largest structural gap
| Spec | Implemented | Gap |
|---|---|---|
| `title`, `agenda`, `outcome_notes` | single `notes` | ⚠️ |
| `status` (planned / completed / cancelled / no-show) | — | ⚠️ |
| `start_time`, `mode` (client_site / office / online / phone), `location` | date + duration only | ⚠️ |
| **MeetingAttendee** table — internal users AND external persons (N:M) | — | ⚠️ missing entirely; the person-360 view depends on it |
| duration (spec: hours; implemented: minutes) | minutes | ✅ acceptable, display in hours |
| account FK, meeting↔project N:M | ✅ (added 2026-08-22) | |

### Document
| Spec | Implemented | Gap |
|---|---|---|
| `version`, `issue_date`, `status` (draft/sent/accepted/superseded) | — | ⚠️ |
| `is_generated`, `source_quotation` — **issued quotation PDFs file themselves** | — | ⚠️ missing; this is a spec-critical behaviour (user-story 3.4.1) |
| type, file, uploader | ✅ (schema only — **no upload UI yet**) | |

### Expense
| Spec | Implemented | Gap |
|---|---|---|
| optional link to the **meeting** that incurred it (capture-at-meeting flow G) | project link only | ⚠️ |
| date, category, amount, currency, receipt, owner-only visibility via DAL | ✅ | |

### Order
| Spec | Implemented | Gap |
|---|---|---|
| `is_void` (POs get cancelled — void, don't delete) | — | ⚠️ |
| po_number, date, amount, currency, status, source_quotation | ✅ (schema only — **no UI yet**) | |

### User
| Spec | Implemented | Gap |
|---|---|---|
| roles: ceo / finance / sales_engineer / sales_manager (stored, not enforced) | `sales` / `manager` | ⚠️ rename to spec values; expense DAL treats manager+ceo as viewers |

### Company
`default_vat_rate` missing (⚠️ minor). Rest ✅.

---

## 3. Feature / screen gaps (spec § flows → what exists)

| Flow (docs/01) | Spec | Built | Gap |
|---|---|---|---|
| A — My Tasks landing | Overdue / due today / this week / **quotations awaiting client** / **projects gone quiet**, 🔁 auto badge | flat open-task list + create | ⚠️ large |
| B — Project from phone call | 3 required fields, **inline account creation** | account page → project form (no inline create, no contact-at-create) | ⚠️ |
| C — Quotation builder | line CRUD, **autocomplete from prior lines**, live margin, snippets, FX prompt, preview, **issue = number + snapshot + lock + auto-file PDF + progress-50 prompt** | read-only view + PDF export; all arithmetic/numbering/PDF plumbing tested underneath | ⚠️ large — partly blocked (B3/B5/B6), but issue-flow mechanics are buildable now |
| D — Revision flow | copy → draft → issue supersedes | — | ⚠️ |
| E — Reorder loop | per-project interval prompted at Won, complete-one-schedules-next, order logging resets clock, pause | cron with hard-coded 90d interval | ❌ mechanic differs from spec |
| F — Progress/status UI | stepper + independent status, Won-consumable prompts interval, Lost asks competitor | buttons + status form (no prompts) | ⚠️ |
| G — Meeting logging | full form + attendees + **expense capture step with privacy notice** | basic form (date/duration/notes/projects) | ⚠️ |
| H — Documents | drag-in upload, type, version; quotations auto-file | schema + `/api/upload` route only, no screen | ⚠️ |
| I — Account 360 | projects, people, meetings, tasks, documents, orders in one view | contacts + meetings + hours + new-project | ⚠️ partial |
| J — Person view | meetings + tasks per contact | — | ⚠️ |
| K — Reports | pipeline · win/loss lost-at-stage · margin · activity/hours · follow-up compliance · spare-part revenue | pipeline-by-progress only | ⚠️ |
| — | Global search (QUO number → record), quick-create menu | — | ⚠️ |

**Solid and verified (keep):** PDF service + bilingual template (10-item checklist passed against the real container) · cost-leak whitelist + sentinel unit & integration tests · money/decimal discipline · quotation numbering allocator · expense DAL visibility rule · auth (Better Auth + Argon2id) · docker-compose · CI with standalone artifact + sentinel gate · 45 ADRs intact.

---

## 4. Blockers — split by who unblocks them

### 4.1 Client answers (KK relays; unchanged from docs/05)
| # | Question | Blocks |
|---|---|---|
| **B1** | Multi-line quotation sample (3+ lines) | Template validation — *most valuable single input* |
| **B2** | Is there a page 2 (bank details / T&C)? | Template structure |
| **B3** | Discount: amount or %? (both modelled, neither confirmed) | Builder line arithmetic UI |
| **B5** | Current quotation counter value (high 69000s) | Seeding before launch (placeholder 69000 in seed now) |
| **B6** | Terms per quotation or per line? | Builder + template |
| **B7** | Does status auto-become Won at 90/100, or by hand? | Flow F behaviour |
| **B10** | What triggers "repeat ordering established" (100)? | Progress semantics for consumables |
| B4/B8/B9/B11 | Revision suffix (default: `-R2`) · labels 40/60/80 · lost reasons · mixed cost currencies | Have defaults, proceed unless client objects |

### 4.2 KK decisions needed NOW (before schema fix — this is the review being requested)
| # | Decision | Recommendation |
|---|---|---|
| **K1** | Fix Account to **multi-select types** with spec values (migration; current data trivial) | Yes — spec is explicit |
| **K2** | Adopt full spec fields for Project / Meeting+Attendees / Task status / Document / Person / Order / Expense (§2 tables) | Yes, in one migration pass |
| **K3** | Rebuild reorder loop per spec: per-project interval, prompt at Won, complete-one-schedules-next, order resets clock, pause flag; **drop the hard-coded 90-day cron logic** (cron remains the scheduler tick) | Yes |
| **K4** | Restore `docs/02-data-model.md` + `04-infrastructure.md` if KK has them; else write 02 fresh from handoff Part B and make it canonical | KK to check |
| **K5** | User role values → `sales_engineer / sales_manager / ceo / finance` | Yes |
| **K6** | Build the quotation **builder mechanics now** with defaults (B4 suffix, both discount shapes) so only the template/arithmetic details wait on B3/B5/B6? Or hold all builder work until answers arrive | Build now with defaults — flag on screen as unconfirmed |
| **K7** | F1–F8 flow defaults (docs/01 §12) | Accept suggested defaults |
| **K8** | N2 visibility (all see all?) · N3 hours account-level · N4 task assignment | Defaults: all-see-all, account-level, assign-to-anyone — confirm |

### 4.3 Nothing blocks (build while waiting)
Schema alignment (after K1–K5 sign-off) · My Tasks dashboard · orders UI · documents UI · meeting full form + attendees · person view · account-360 completion · search · reports that don't need margin storage.

---

## 5. Proposed plan (no work starts until KK approves)

**Phase A — Schema alignment** *(after K1–K5)*: one migration implementing every §2 fix. Update DAL/DTOs/seeds/tests. No screen work. ~Small-medium.

**Phase B — Spec-correct core flows** *(needs nothing from client)*:
1. Reorder loop per spec (K3) — interval on project, Won prompt, task-chain, pause; orders UI (log PO, void) resetting the clock.
2. My Tasks dashboard sections (overdue/today/week/awaiting-client/gone-quiet, won-consumables excluded from quiet).
3. Meetings: full form, attendees (internal+external), expense capture step with privacy notice.
4. Documents: upload UI per project, types, version; wire the existing `/api/upload`.
5. Account 360 + Person view; inline account creation in project form.

**Phase C — Quotation builder** *(mechanics now if K6=yes; arithmetic/template details land when B3/B5/B6 arrive)*: line CRUD + components + image, autocomplete from prior lines, live margin (client-side decimal.js, server authoritative), FX prompt, issue flow (number, snapshot, lock, **auto-file PDF as Document**, progress-50 prompt), revision flow.

**Phase D — Reports & polish**: the six fixed reports (needs stored total_cost/margin from Phase A), global search, quick create, CSV export.

Suggested order: **A → B1 → C (mechanics) → B2–B5 → C (finish on client answers) → D.**

---

## 6. Session log

| Date | What happened |
|---|---|
| 2026-08-15 | Scaffold: app skeleton, guardrails, PDF service (verified vs 10-item checklist), Docker, CI, ADR-0045. Schema reconstructed from ADRs — **source of most §2 gaps** |
| 2026-08-22 | Contact creation + basic meetings module added. KK moved local Postgres to port 8888, seed reads `local.env` |
| 2026-08-22 | **This review.** Full re-read of user-story + design docs; gap analysis §2–3; plan §5. Waiting on K1–K8 |
