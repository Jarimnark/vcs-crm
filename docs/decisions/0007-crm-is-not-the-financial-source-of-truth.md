# ADR-0007: The CRM is not the financial source of truth

- **Status:** Accepted — premise corrected by [ADR-0018](0018-no-erp-invoice-boundary.md)
- **Date:** 2026-07-29
- **Deciders:** KK
- **Phase:** Product concept / Integration

> **Amended 2026-07-29.** This record assumed VCS has an accounting/ERP system that owns money, and argued the CRM must not contradict it. **There is no ERP — invoicing is manual.** The conclusion survives but on different grounds, and Phase 3 "integration" becomes manual entry plus spreadsheet import. See [ADR-0018](0018-no-erp-invoice-boundary.md), which also reopens whether the CRM should eventually issue invoices at all.

## Context

Phase 3 asks for CEO-facing figures: sales amount, allowance, and possibly finance views. There is a strong pull, once a CRM holds deal values and margins, to let it become the place where revenue is calculated and reported.

VCS presumably already has an accounting system that produces invoices and recognises revenue (open question Q6 confirms which). Two systems producing revenue numbers that disagree is a well-known and corrosive failure: leadership loses confidence in both, and someone ends up maintaining a reconciliation spreadsheet — exactly the manual work this project exists to remove.

## Options considered

1. **CRM owns the financial numbers** — compute revenue, margin, and recognition in the CRM.
   - Pro: one system, no integration work, complete control over the reporting model.
   - Con: the CRM would need invoicing, credit notes, partial deliveries, foreign-exchange treatment, and revenue-recognition rules to be correct. This is building an accounting system by accident. Its numbers would diverge from the books, and the books win every argument.

2. **CRM reads actuals from the accounting/ERP system** and presents them alongside pipeline data.
   - Pro: one authoritative source for money; the CRM contributes what only it knows (pipeline, forecast, activity, engineering effort) and combines the two into a picture neither system can produce alone.
   - Con: requires an integration, which depends on the accounting system having an API or at least an export.

3. **Keep them entirely separate** — CRM shows pipeline, finance shows actuals, humans combine them.
   - Pro: no integration work.
   - Con: leaves the CEO doing the manual assembly this project is meant to eliminate.

## Decision

The CRM is **not** the financial source of truth. The accounting/ERP system owns booked revenue, invoiced amounts, payments, and recognised revenue. The CRM owns pipeline, forecast, expected value, and estimated margin.

Phase 3 brings actuals *into* the CRM by reading from the accounting system, clearly labelled as sourced from it, and presents them next to CRM-owned pipeline data.

Estimated margin computed from line-item cost and price is a CRM figure, must be labelled "estimated", and must never be presented as a financial result.

## Rationale

The value of a CEO dashboard is entirely in whether it is trusted. A dashboard that disagrees with the accounts is not a slightly-worse dashboard — it is a liability, because every number on it becomes suspect and the CEO goes back to asking people directly.

The CRM's genuine contribution is the *forward* view: what is coming, weighted by stage, with engineering effort visible. Combining that with authoritative actuals from finance produces something neither system offers alone. Recomputing what finance already computes correctly adds no value and creates a contradiction.

## Consequences

- Open question Q6 (which system holds actuals, does it expose an API) becomes a hard dependency on Phase 3 and should be answered early — the answer may take months to arrange.
- Every money figure in the UI must be labelled with its source and nature: *estimated* (CRM) vs *actual* (finance).
- Deal value in the CRM is an SE's estimate. It should never be reported as revenue.
- If the accounting system has no API, Phase 3 falls back to a periodic import (CSV or scheduled export). This is acceptable and should be designed for from the start rather than treated as a failure case.
- Sales allowance calculation, once defined (open question Q1), must decide explicitly whether it runs off CRM data or finance data. If it affects anyone's pay, it runs off finance data.

## Revisit when

Phase 3 design starts, or if VCS replaces its accounting system.
