# ADR-0006: Single tenant, two roles, flat data visibility

- **Status:** Accepted — amended by [ADR-0027](0027-adopt-client-phase-1-specification.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Security

> **Amended 2026-08-11.** The client excludes **role permissions from Phase 1**. `User.role` (ceo / finance / sales_engineer / sales_manager) is stored but not enforced. Visibility is uniformly flat — the expense exception is gone with [ADR-0033](0033-expenses-deferred-to-phase-2.md). Whether a sales engineer sees only their own projects remains an open client question (their D21); `owner_user` exists either way, so it can be decided late — but before launch. The extensibility advice below still applies: roles as data, authorisation centralised.

> **Amended 2026-07-29.** Flat visibility stands for all sales data. The one exception anticipated below has been confirmed: **expenses are visible only to their owner and the Manager** ([ADR-0017](0017-expense-visibility-restriction.md)).

## Context

VCS CRM is an internal tool for one company, with fewer than 10 users in the MVP — a sales engineer team plus a manager. Permission models are one of the easiest places to over-build: territory rules, record-level sharing, field-level security, and team hierarchies all sound prudent and all cost real time.

At the same time, Phase 3 introduces genuinely sensitive data — sales allowance and compensation figures — which cannot simply be visible to everyone.

## Options considered

1. **Full RBAC with record-level sharing rules** from the start.
   - Pro: ready for any future org shape; nothing to retrofit.
   - Con: weeks of work and permanent complexity in every query, to serve a team of under ten people who all sit together and already know each other's deals.

2. **Two roles, flat visibility** — everyone sees all sales data; role controls edit rights and access to management reports.
   - Pro: fast to build, easy to reason about, matches how a small SE team actually operates. Shared visibility is arguably a feature: SEs can see what a colleague did at the same customer last year, which is one of the stated jobs to be done (J8).
   - Con: no answer yet for compensation data; would need extending if VCS grows or adds branches.

3. **No permissions at all** — everyone is an admin.
   - Pro: fastest.
   - Con: no protection against accidental mass edits or deletion, and no path at all to Phase 3's sensitive data.

## Decision

Single-tenant application. Two roles in Phase 1:

| Role | Can do |
|---|---|
| **SE** | Full read on all sales data; create and edit their own records; edit others' records (small team, trust-based); access SE-level reports |
| **Manager** | Everything an SE can do, plus management reports, user administration, and configuration (stages, templates, principals) |

All sales data is visible to all users. No territory or record-level sharing rules.

**Deferred to Phase 3:** compensation and allowance data will require a third role or an explicit field-level restriction. That design is out of scope now, but the auth model must be built so a third role can be added without rework — roles as data, not hard-coded booleans.

## Rationale

At under 10 co-located users, elaborate permissions solve a problem that does not exist while imposing a cost on every feature built afterwards. Shared visibility actively helps: the account-history job (J8) depends on an SE seeing what a colleague did.

The one place this genuinely breaks is compensation, and that is a Phase 3 concern. Rather than build a permission system now for data that does not yet exist, we build the simple thing and make sure the simple thing is *extensible* — which costs nothing if decided upfront and a rewrite if discovered late.

Multi-tenancy is explicitly rejected. VCS is one company; building for hypothetical other tenants would add a scoping key to every table and a filter to every query for no current benefit.

## Consequences

- Queries stay simple — no sharing-rule evaluation on reads.
- Authorisation logic must be centralised (a single permission check module), so adding a role later is one file, not fifty.
- Roles are stored as data with a role→permission mapping, not as `isManager` booleans scattered through the code.
- Audit trail matters more when everyone can edit everything: record `created_by`, `updated_by`, and timestamps on all entities from day one, and keep a change history on opportunity stage and value. This is cheap now and impossible to reconstruct later.
- If VCS adds a second sales branch or a channel-partner team, this decision needs revisiting before that team is onboarded.

## Revisit when

Any of: user count passes ~25; a second team, branch, or region is added; Phase 3 compensation design begins; or an external party (partner, contractor) needs access.
