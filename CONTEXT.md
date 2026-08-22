# Build Context — living document

| | |
|---|---|
| **Purpose** | Running state of the implementation: what exists, how it diverges from the spec, what is blocked, what happens next. Updated every working session. |
| **Updated** | 2026-08-22 (evening — answers received) |
| **Status** | ✅ **Phase A COMPLETE (2026-08-22)** — schema now implements `docs/02-data-model.md` directly (verified by migrating + seeding a real Postgres 16 and smoke-testing the constraints). Phase B (spec-correct flows: My Tasks dashboard, documents UI, attendee-rich meeting UI, account 360) and Phase C (quotation builder) are next. Outstanding from client: **B1** (multi-line sample), **B5** (current counter value), **T1** (T&C wording). |
| **Spec sources** | `user-story/` (client, authoritative) → `docs/00,01,03,05` → ADRs |

---

## 1. Why the implementation diverges from the spec — honest root cause

Three causes, in order of impact:

1. **~~Two design documents are missing from the repository~~ — CORRECTION 2026-08-22: they were there all along.** `docs/02-data-model.md` and `docs/04-infrastructure.md` have been in the initial commit the whole time. The session-start directory listing was truncated at 50 entries (the docs tree has ~56 files) and both fell off the end — the assistant wrongly concluded they were missing and **reconstructed the schema from ADR summaries instead of reading the real table design**. A tooling/verification mistake, not a repo problem. K4 is moot.
   → **`docs/02-data-model.md` is canonical. Phase A implements it directly** (19 tables, constraints, indexes, conventions), as amended by ADR-0046/0047.
2. **The scaffold was architecture-first, not feature-first.** The first push prioritized the guardrails (PDF whitelist + sentinel test, money discipline, DAL, CI, Docker) because those are the expensive-to-retrofit parts. Entity completeness and screens were deliberately thin — but that boundary was not written down clearly, so it reads as "huge difference" rather than "planned phase 1 of the build".
3. **A few outright misreads** (not simplifications) — listed in §2 marked ❌. These are bugs against the spec and need migration fixes.

---

## 2. Schema gap analysis — spec vs `src/db/schema.ts`

> ✅ **CLOSED by Phase A (2026-08-22).** The schema now implements `docs/02-data-model.md` directly — all 19 domain tables, the VARCHAR+union convention, CHECK constraints, partial/GIN/trigram indexes, audit columns, `purchase_order` naming, counter on `company` with allocation at issue, and the ADR-0046/0047 amendments. Verified by migrating and seeding a real Postgres 16 and smoke-testing the constraints (lost-needs-reason, consumable-only interval, one-primary-per-account, forward-only counter). The tables below are kept as the historical record of what the scaffold got wrong.

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

### 4.1 Client answers — ✅ ANSWERED 2026-08-22 ([ADR-0046](docs/decisions/0046-client-answers-quotation-and-project-model.md))
| # | Answer | Consequence |
|---|---|---|
| **B1** | ⏳ still outstanding | Multi-line sample — validates row spacing / page breaks; does not block build |
| **B2** | ✅ **Page 2 exists: standard T&C move there** | Template gains a conditional final T&C page; wording is company-level → **new item T1: get the T&C text from VCS** |
| **B3** | ✅ **Enter either amount or %; system derives the other** | Builder shows both, `discount_type` records which was entered; printed column shows amount, `-` when none |
| **B4** | ✅ Suffix `-R2` | Already implemented |
| **B5** | ⏳ **still needed: the current counter number.** Why not year-based: the samples are one continuous no-reset sequence (69xxx carries no year meaning) — the seed is just "the last number VCS used". **KK's follow-up "what if they want 700XX next year?" → answered in [ADR-0047](docs/decisions/0047-quotation-counter-forward-reseed.md): the admin sets the next number forward (e.g. to 70000) whenever VCS wants — forward-only, gaps safe, never backwards.** Placeholder stays until the real value arrives — blocks launch, not build |
| **B6** | ✅ Terms per quotation (header) | Confirmed; per-quotation terms in the terms block, standard T&C on the final page |
| **B7** | ✅ Status set **by hand** | No auto-Won; UI keeps the two controls fully independent |
| **B8** | ✅ **No progress labels** | UI shows plain percentages; drop the label ladder |
| **B9** | ✅ **No lost-reason codes** | Free text stays (required on Lost); remove the picklist kind |
| **B10** | ✅ 100 (repeat established) set **manually** | System prompts interval at Won but never moves progress |
| **B11** | ✅ Never mixed | Header-level FX stands as designed |

### 4.2 KK decisions — ✅ ALL APPROVED 2026-08-22
| # | Decision | Outcome |
|---|---|---|
| **K1** | Account → **multi-select types** with spec values | ✅ approved |
| **K2** | Full spec-field alignment (Project / Meeting+Attendees / Task status / Document / Person / Order / Expense) | ✅ approved |
| **K3** | Reorder loop per spec; drop hard-coded 90-day logic | ✅ approved |
| **K4** | Locate `docs/02-data-model.md` + `04-infrastructure.md` | ✅ **Resolved — they were in the repo all along** (initial commit). The "missing files" claim was the assistant's error: a truncated directory listing at session start. `02-data-model.md` is now the canonical schema source for Phase A |
| **K5** | Roles → `sales_engineer / sales_manager / ceo / finance` | ✅ approved |
| **K6** | Build the quotation builder now | ✅ approved — B3 answered, so discount UI is fully specified; numbering runs on the placeholder seed until B5's value arrives |
| **K7** | F1–F8 defaults | ✅ approved |
| **K8** | N2 all-see-all · N3 account-level hours · N4 assign-to-anyone | ✅ confirmed |

### 4.3 Nothing blocks (build while waiting)
Schema alignment (after K1–K5 sign-off) · My Tasks dashboard · orders UI · documents UI · meeting full form + attendees · person view · account-360 completion · search · reports that don't need margin storage.

---

## 5. Proposed plan (no work starts until KK approves)

**Phase A — Schema alignment** *(approved)*: implement **`docs/02-data-model.md` directly** (it was present all along — see §1), as amended by ADR-0046/0047. Beyond the §2 gap tables, the real data model adds these deltas the reconstruction missed:
- **Conventions**: `VARCHAR` + TS union instead of Postgres enums (scaffold used `pgEnum` — migrate off); `created_by`/`updated_by` audit columns on every editable table; picklist rows are `code` + `label` (scaffold has `value` only); CHECK constraints in Postgres (lost-requires-reason, part-only parent, consumable-only interval, one-primary-person partial index).
- **Counter moves onto `company`** (`quotation_number_prefix` + `quotation_number_next`), allocation **at issue not draft-creation** (scaffold allocates at creation from a separate table), plus ADR-0047's forward-only "set next number" admin control.
- **`purchase_order` as the physical table name** (`order` is reserved; 02 §7 recommends renaming — scaffold hand-writes `"order"` in SQL today).
- **Rounding once at document total, not per line** (02 §6.2) — scaffold's `lineAmount` rounds per line; fix totals.ts + tests.
- ADR-0046 amendments to 02: `lost_reason_id` FK → **free text** (no picklist kind); company gains a **T&C text field** (B2/T1); progress labels dropped.
Update DAL/DTOs/seeds/tests accordingly. ~Medium.

**Phase B — Spec-correct core flows** *(needs nothing from client)*:
1. Reorder loop per spec (K3) — interval on project, Won prompt, task-chain, pause; orders UI (log PO, void) resetting the clock.
2. My Tasks dashboard sections (overdue/today/week/awaiting-client/gone-quiet, won-consumables excluded from quiet).
3. Meetings: full form, attendees (internal+external), expense capture step with privacy notice.
4. Documents: upload UI per project, types, version; wire the existing `/api/upload`.
5. Account 360 + Person view; inline account creation in project form.

**Phase C — Quotation builder** *(approved, fully unblocked by ADR-0046 except B1 cosmetics)*: line CRUD + components + image, dual-entry discount (amount ⇄ %), autocomplete from prior lines, live margin (client-side decimal.js, server authoritative), FX prompt, issue flow (number, snapshot, lock, **auto-file PDF as Document**, progress-50 prompt), revision flow (`-R2`), template: T&C final page rendered when company T&C text is set (T1), progress shown as plain % (B8).

**Phase D — Reports & polish**: the six fixed reports (needs stored total_cost/margin from Phase A), global search, quick create, CSV export.

Suggested order: **A → B1 → C (mechanics) → B2–B5 → C (finish on client answers) → D.**

---

## 6. Session log

| Date | What happened |
|---|---|
| 2026-08-15 | Scaffold: app skeleton, guardrails, PDF service (verified vs 10-item checklist), Docker, CI, ADR-0045. Schema reconstructed from ADRs — **source of most §2 gaps** |
| 2026-08-22 | Contact creation + basic meetings module added. KK moved local Postgres to port 8888, seed reads `local.env` |
| 2026-08-22 | **This review.** Full re-read of user-story + design docs; gap analysis §2–3; plan §5. Waiting on K1–K8 |
| 2026-08-22 | **Answers received.** B2–B4, B6–B11 answered; K1–K3, K5–K8 approved → [ADR-0046](docs/decisions/0046-client-answers-quotation-and-project-model.md). Docs updated (00, 05, README, this file). Still open: B1, B5 value, T1 T&C wording, K4 file check. Next session starts Phase A |
| 2026-08-22 | **Correction: 02-data-model.md and 04-infrastructure.md were in the repo all along** — the "missing files" claim came from a truncated session-start listing (K4 resolved). 02 read in full and made canonical for Phase A; new deltas folded into the Phase A plan (no-pgEnum convention, counter on company + allocation at issue, `purchase_order` naming, document-level rounding, audit columns). KK's 700XX question → [ADR-0047](docs/decisions/0047-quotation-counter-forward-reseed.md): forward-only manual re-seed |
| 2026-08-22 | **Review round 1 shipped** (KK's page-by-page comments): tasks got full relations (project/account/person/type/description/assignee) plus list-with-filters and a view/edit page; projects got a + New Project page with account select OR inline new-account name, the progress stepper now shows the ladder definitions (supersedes ADR-0046 B8 at KK's request), and **setting Won requires the real amount, recorded as the first Order** (PO number optional, "(pending)" until it arrives) with the consumable interval prompt in the same form; accounts render types as toggle chips, gained a `phone` column (migration 0001) and full new/edit pages plus contact edit; meetings got view + edit pages and an account-filtered project/attendee picker (client component); expenses got owner edit. **Every list now has search + filters + pagination (20/page)** via shared SearchBar/Pagination components. Confirmations resolved: Won stores a simple won_amount field on the project (migration 0002) rather than auto-creating an Order; ladder wording, 20/page, and account-on-form all confirmed. Verified: typecheck, lint, 32 tests, build, migrations 0000+0001 against real Postgres 16 |
| 2026-08-22 | **Phase A shipped.** Schema rewritten to 02 (19 tables, varchar+union, CHECKs, partial/GIN/trigram indexes, audit columns, `purchase_order`, counter on company, allocation at issue); DAL rewritten (expenses scope = sales_manager/ceo, projects with history+followup+competitor, tasks with status enum + complete-one-schedules-next chain, orders with void, meetings with attendees, admin with code+label picklists and the forward-only counter control); screens updated (multi-type accounts, full contact form, orders + follow-up controls on project page, meeting form with expense capture + privacy notice, six-kind picklist admin, company T&C + counter, user roles); template renamed to 02 field names + discount/VAT-rate rows + conditional T&C final page; totals rewritten (subtotal/discount/vat-rate, dual-entry discount derivation, precision-preserving margin chain); seed per 02 §13. **Migration reset — fresh 0000_init.sql: run `docker compose down -v` locally, then migrate + seed.** Verified: typecheck, lint, 32 tests incl. live render + T&C page 2/2, `next build`, real-Postgres migrate/seed/constraint smoke. Rounding interpretation recorded in totals.ts header. Next: Phase B |
