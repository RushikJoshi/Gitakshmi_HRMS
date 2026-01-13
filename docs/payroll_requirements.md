Payroll Module — Requirements & Implementation Plan

Overview

This document summarizes essential and advanced payroll features (industry-standard HRMS), acceptance criteria, data-model/API/UI changes, and an implementation roadmap tailored to this repository.

Mandatory Core Features

- Attendance integration
  - Map attendance statuses (present/half_day/leave/holiday/weekly_off) to payroll logic
  - Support manual overrides, locked records after payroll
  - Acceptance: payroll preview counts presentDays correctly and respects locked flag

- Salary Templates & Assignments
  - Template components: name, monthlyAmount, flags (proRata, taxable, employerContribution)
  - Track `SalaryAssignment` effectiveFrom/effectiveTo to pick active template
  - Acceptance: payroll uses active assignment or explicit template for preview/run

- Gross & Net Calculation
  - Earnings snapshot with pro-rata for basic and flagged components
  - Pre-tax deductions (EPF, ESI, professional tax) and post-tax deductions (LOP, loans)
  - Taxable income and TDS (TDS engine to support simple slabs; pluggable for rules)
  - Acceptance: preview returns gross, taxable, deductions, incomeTax, net

- Statutory Compliance (India-specific defaults)
  - EPF: employee 12% of PF wage (with wage limit), employer contributions snapshot
  - ESI: employee 0.75% where applicable
  - Professional tax rules per state (config-driven)
  - Acceptance: rules applied when company settings enable them

- Payslip Snapshot & Persistence
  - Immutable payslip snapshot saved with payrollRunId
  - PayrollRun & PayrollRunItem records with statuses (PROCESSING, CALCULATED, APPROVED, PAID)
  - Lock attendance records once payroll is CALCULATED

- Preview & Dry Run
  - Endpoint to calculate preview for selected employees without saving
  - Frontend hooks to show per-employee preview and errors

- Run/Approve/Mark Paid
  - Run: perform dry-run validations, save payslips, create PayrollRunItems
  - Approve: change status to Approved (HR), allow marking paid
  - Mark Paid: record payment details and trigger payslip distribution

Advanced Features (Phase 2+)

- Retroactive adjustments & arrears
- Loan/advance amortization schedules
- Multi-currency support
- Accounting integrations (export journal entries)
- Payroll scheduling & recurring runs
- Automated payslip emails and ESS notifications

APIs to Add/Improve

- POST /api/payroll/process/preview (exists) — ensure returns breakdown and errors
- POST /api/payroll/process/run (exists) — add strict validations, partial skips reporting
- POST /api/payroll/templates/:id/flags — allow component flags (proRata, taxable)
- GET /api/payroll/runs/:id/export — CSV / accounting export

Frontend Changes

- `ProcessPayroll.jsx` enhancements:
  - Show attendance details and warning when presentDays < threshold
  - Allow selecting template per employee with inline validation
  - Show detailed breakdown modal per employee (earnings, deductions, taxes)
  - Support multi-step run: Preview -> Calculate -> Run -> View Run Summary

Data & Model Changes

- `SalaryTemplate.earnings` items need `flags: { proRata: Boolean, taxable: Boolean }`
- `Payslip` schema already stores snapshots — verify fields: grossEarnings, netPay, attendanceSummary
- `PayrollRun` should include run initiator, totals, skipped/failed lists

Testing & QA

- Unit tests for `calculateEmployeePayroll` covering: full month, mid-join, LOP, EPF/ESI thresholds, zero payable days
- Integration tests for preview and run endpoints
- Manual QA checklist for HR flows

Security & Performance

- Rate-limit heavy endpoints; paginate results
- Ensure multi-tenant DBManager model registration is safe and not leaking models
- Offload PDF generation to background worker if large

Implementation Roadmap (suggested priorities)

1. Research & doc (this file) — Done
2. Fix attendance status mappings & preview bugs — (quick wins already applied)
3. Add component flags to `SalaryTemplate` and small migration to backfill defaults
4. Implement a configurable TDS engine module (start with simplified slabs)
5. Add stateful run workflow: save PayrollRun with detailed summary and error reporting
6. Enhance `ProcessPayroll.jsx` to show per-employee breakdown and run status
7. Add unit/integration tests for payroll service
8. Advanced features and accounting export

Estimated Effort (rough)

- Core (2–4 weeks): items 2–6 with tests and UI polish
- Advanced (4+ weeks): arrears, accounting, multi-currency, background jobs

Next steps I can take now (pick one):

- Implement TDS engine and wire into `calculateEmployeePayroll` (backend)
- Add `proRata` and `taxable` flags to earnings components and a migration
- Improve frontend `ProcessPayroll.jsx` to display breakdown modal and re-check previews

Tell me which of the next steps you'd like prioritized, or say `Do all` to proceed in order.