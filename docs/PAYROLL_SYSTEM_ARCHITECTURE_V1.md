# PAYROLL SYSTEM ARCHITECTURE V1.0
## Production-Ready Enterprise Payroll Engine

**Version:** 1.0  
**Status:** Production  
**Last Updated:** January 2026  
**Architect:** Senior HRM & Payroll Systems Engineer  

---

## 📋 TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Data Models](#data-models)
4. [Payroll Calculation Engine](#payroll-calculation-engine)
5. [API Specifications](#api-specifications)
6. [Compliance & Audit](#compliance--audit)
7. [Edge Cases & Handling](#edge-cases--handling)
8. [Configuration & Extensibility](#configuration--extensibility)
9. [Deployment & Operations](#deployment--operations)

---

## EXECUTIVE SUMMARY

This payroll system is designed to:
- **Support global payroll operations** with configurable rules per country/region
- **Ensure compliance** with local tax laws, labor regulations, and statutory deductions
- **Maintain full auditability** with immutable snapshots and comprehensive logs
- **Handle complex scenarios** including pro-rata calculations, multiple pay cycles, and off-cycle runs
- **Scale to 10,000+ employees** with optimized database design and caching
- **Remain extensible** for future multi-currency, multi-company, and multi-country support

**Key Principles:**
- ✅ Server-side only calculations (never trust frontend)
- ✅ Immutable payslip snapshots (once calculated, locked forever)
- ✅ Full audit trail (who, what, when, why)
- ✅ Role-based access control
- ✅ Idempotent operations (no duplicate payroll runs)
- ✅ Accuracy to 2 decimal places (rounding rules strictly enforced)

---

## SYSTEM ARCHITECTURE OVERVIEW

### High-Level Flow

```
[HR Initiates Payroll]
        ↓
[Fetch Eligible Employees]
        ↓
[Calculate Payroll (Dry-Run)]
        ↓
[Preview & Validation]
        ↓
[HR/Finance Approval]
        ↓
[Lock & Generate Payslips]
        ↓
[Bank Transfer & Accounting Entries]
        ↓
[Archive & Audit Log]
```

### Component Breakdown

| Component | Purpose | Status |
|-----------|---------|--------|
| **Payroll Service** | Core calculation engine | ✅ Implemented |
| **Payroll Run Controller** | Run management (CRUD) | ✅ Implemented |
| **Payroll Process Controller** | Preview & execution | ✅ Implemented |
| **Payslip Controller** | Retrieve & generate PDFs | ✅ Implemented |
| **Validation Engine** | Pre-flight checks | ⚠️ Partial (need enhancement) |
| **Approval Workflow** | Multi-level approvals | ❌ Pending (design provided) |
| **Audit Logger** | Compliance tracking | ⚠️ Basic (need enhancement) |
| **Tax Calculator** | TDS/Income Tax | ✅ Implemented (configurable) |
| **PDF Generator** | Payslip rendering | ✅ Implemented |
| **Bank Integration** | NEFT/RTGS files | ❌ Future |

---

## DATA MODELS

### 1. PayrollRun (Master Record)
```javascript
{
  tenantId: ObjectId,           // Multi-tenant isolation
  month: 1-12,                  // Pay period
  year: YYYY,                   // Pay year
  status: INITIATED|CALCULATED|APPROVED|PAID|CANCELLED,
  
  // Audit Trail
  initiatedBy: EmployeeId,
  initiatedAt: DateTime,
  calculatedBy: EmployeeId,
  calculatedAt: DateTime,
  approvedBy: EmployeeId,
  approvedAt: DateTime,
  paidBy: EmployeeId,
  paidAt: DateTime,
  
  // Statistics
  totalEmployees: Number,
  processedEmployees: Number,
  failedEmployees: Number,
  totalGross: Decimal,
  totalDeductions: Decimal,
  totalNetPay: Decimal,
  
  // Control
  locked: Boolean,              // Prevents modifications
  executionErrors: [{...}],
  notes: String
}

// INDEXES:
// - (tenantId, month, year) UNIQUE
// - (tenantId, status)
// - (tenantId, year, month)
```

**Why this design:**
- ✅ Unique constraint prevents duplicate runs
- ✅ Status workflow tracks progress
- ✅ Audit fields ensure accountability
- ✅ Locked flag prevents silent edits after approval
- ✅ Totals enable quick reporting without aggregations

---

### 2. Payslip (Immutable Snapshot)
```javascript
{
  tenantId: ObjectId,
  employeeId: ObjectId,
  payrollRunId: ObjectId,       // Links to PayrollRun
  
  // Pay Period
  month: 1-12,
  year: YYYY,
  
  // Employee Info Snapshot (frozen at calculation time)
  employeeInfo: {
    employeeId: String,
    name: String,
    designation: String,
    department: String,
    bankAccountNumber: String,
    bankIFSC: String,
    bankName: String,
    panNumber: String
  },
  
  // Earnings Snapshot (with pro-rata details)
  earningsSnapshot: [{
    name: String,
    amount: Decimal,
    isProRata: Boolean,
    originalAmount: Decimal,     // Before pro-rata
    daysWorked: Number,
    totalDays: Number
  }],
  
  // Deductions (captured separately for clarity)
  preTaxDeductionsSnapshot: [{    // EPF, ESI, Prof Tax, etc.
    name: String,
    amount: Decimal,
    category: String
  }],
  postTaxDeductionsSnapshot: [{   // Loans, LOP, Advances, Penalties
    name: String,
    amount: Decimal,
    category: String
  }],
  
  // Employer Contributions (for transparency, not deducted from employee)
  employerContributionsSnapshot: [{
    name: String,
    amount: Decimal
  }],
  
  // Calculated Totals
  grossEarnings: Decimal,
  preTaxDeductionsTotal: Decimal,
  taxableIncome: Decimal,
  incomeTax: Decimal,
  postTaxDeductionsTotal: Decimal,
  netPay: Decimal,
  
  // Attendance Impact
  attendanceSummary: {
    totalDays: Number,
    presentDays: Number,
    leaveDays: Number,
    lopDays: Number,            // Loss of Pay
    holidayDays: Number
  },
  
  // Salary Template Reference
  salaryTemplateId: ObjectId,
  salaryTemplateSnapshot: {
    templateName: String,
    annualCTC: Decimal,
    monthlyCTC: Decimal
  },
  
  // TDS Details
  tdsSnapshot: {
    annualTaxable: Decimal,
    annualTax: Decimal,
    monthly: Decimal,
    monthlyAdjustment: Decimal,
    regime: String               // OLD | NEW (extensible)
  },
  
  // Data Integrity
  hash: String,                 // SHA256 of calculation data
  pdfPath: String,              // Generated PDF location
  
  // Control
  status: DRAFT|FINAL|DISPUTED,
  createdAt: DateTime,
  lockedAt: DateTime,
  generatedBy: EmployeeId
}

// INDEXES:
// - (tenantId, employeeId, year, month)
// - (tenantId, payrollRunId)
// - (payrollRunId, status)
```

**Why immutable snapshots:**
- ✅ Protects against retroactive modifications
- ✅ Audit-proof (hash ensures data integrity)
- ✅ Allows restatement without affecting originals
- ✅ Fast retrieval (no recalculation needed)
- ✅ Compliance with tax authority requirements

---

### 3. SalaryAssignment (Historical Record)
```javascript
{
  tenantId: ObjectId,
  employeeId: ObjectId,
  salaryTemplateId: ObjectId,
  
  // Effective Dates
  effectiveFrom: DateTime,       // When this salary starts
  effectiveTo: DateTime,         // When it ends (null = current)
  
  // Control
  payFrequency: String,          // Monthly (future: bi-weekly, weekly)
  status: ACTIVE|INACTIVE,
  
  // Snapshot at Assignment
  assignmentSnapshot: {
    annualCTC: Decimal,
    monthlyCTC: Decimal
  },
  
  assignedBy: EmployeeId,
  createdAt: DateTime
}

// INDEXES:
// - (tenantId, employeeId, effectiveFrom DESC)
```

**Why historical tracking:**
- ✅ Supports salary changes mid-month
- ✅ Enables restatement with old templates
- ✅ Provides audit trail of compensation changes
- ✅ Prevents "always retroactive" salary edits

---

### 4. PayrollConfiguration (Tenant-Specific Rules)
```javascript
{
  tenantId: ObjectId,
  
  // Tax Configuration
  taxRules: {
    country: String,            // IN | US | UK | etc.
    taxRegime: String,          // OLD | NEW (India-specific)
    taxYear: Number,
    taxSlabs: [{                // Configurable slabs
      minIncome: Decimal,
      maxIncome: Decimal,
      rate: Decimal             // Percentage
    }],
    standardDeduction: Decimal,
    rebateCap: Decimal
  },
  
  // Statutory Rules
  statutoryRules: {
    epfWageLimit: Decimal,      // Typically 15,000 INR
    epfRate: Decimal,           // 12% employee
    epfEmployerRate: Decimal,   // 12% employer
    esiLimit: Decimal,          // Typically 21,000 INR
    esiRate: Decimal,           // 0.75% employee
    esiEmployerRate: Decimal,   // 3.25% employer
    professionalTaxRate: Decimal,
    professionalTaxLimit: Decimal
  },
  
  // Payroll Rules
  payrollRules: {
    proRataMethod: String,      // DAYS_WORKED | CALENDAR_DAYS
    lopRate: Decimal,           // Loss of Pay daily rate
    allowanceExemption: {       // HRA exemption rules
      basePercent: Decimal,
      rentPercent: Decimal
    },
    overtimeMultiplier: Decimal,// 1.5x, 2x, etc.
    bankTransferCutoffDay: Number// 1-31
  },
  
  // Company Rules
  companyRules: {
    currency: String,           // INR, USD, etc.
    fiscalYearStart: String,    // MM-DD format
    timezone: String,
    roundingMethod: String      // HALF_UP | DOWN | UP
  }
}

// INDEXES:
// - (tenantId) UNIQUE
```

**Why configurable rules:**
- ✅ Supports multiple countries without code changes
- ✅ Allows future tax law updates via UI
- ✅ Enables A/B testing different configurations
- ✅ Makes compliance requirements explicit and auditable

---

### 5. PayrollValidationLog (Audit Trail)
```javascript
{
  tenantId: ObjectId,
  payrollRunId: ObjectId,
  
  validationStep: String,       // EMPLOYEE_FETCH | TEMPLATE_CHECK | ATTENDANCE_FETCH | etc.
  status: PASS|WARNING|FAIL,
  
  details: {
    employeeCount: Number,
    employeesMissingTemplate: [ObjectId],
    employeesZeroAttendance: [ObjectId],
    employeesNegativePay: [ObjectId],
    warnings: [String],
    errors: [String]
  },
  
  performedBy: EmployeeId,
  performedAt: DateTime,
  duration: Number              // Milliseconds
}

// INDEXES:
// - (tenantId, payrollRunId)
```

---

## PAYROLL CALCULATION ENGINE

### Step-by-Step Calculation Logic

```
INPUT: Employee, Salary Template, Attendance, Tax Config
OUTPUT: Payslip with all calculations

════════════════════════════════════════════════════════════════

STEP 1: ATTENDANCE SUMMARY
────────────────────────────
  totalDays = Days in month
  presentDays = Count attendance records with "present" status
  leaveDays = Count with "leave" status (paid)
  lopDays = Count absent or unpaid leave
  holidayDays = Public holidays in month

  ✅ If employee joined mid-month:
     totalDays = Days from joining to month-end
  
  ✅ If employee resigned mid-month:
     totalDays = Days from month-start to resignation
  
  ✅ If backdated attendance:
     Re-calculation allowed within lock period

════════════════════════════════════════════════════════════════

STEP 2: GROSS EARNINGS CALCULATION
──────────────────────────────────
  
  FOR EACH earning component in salaryTemplate:
    
    IF earning.proRata == TRUE (or legacy: name contains "Basic"):
      // Pro-rata = (monthlyAmount / totalDays) × presentDays
      amount = (earning.monthlyAmount / totalDays) × presentDays
    ELSE:
      // Fixed component, no pro-rata
      amount = earning.monthlyAmount
    
    ADD amount to grossEarnings
  
  ✅ Rounding: Round to 2 decimal places (HALF_UP)
  
  grossEarnings = SUM of all earnings (rounded)

════════════════════════════════════════════════════════════════

STEP 3: PRE-TAX DEDUCTIONS (Reduce Taxable Income)
────────────────────────────────────────────────
  
  3.1 EMPLOYEE PROVIDENT FUND (EPF)
      epfWage = MIN(basicAmount, epfLimit)  // Typically 15,000 INR
      epf = epfWage × 0.12                  // 12% employee contribution
  
  3.2 EMPLOYEE STATE INSURANCE (ESI)
      IF grossEarnings <= esiLimit (typically 21,000):
        esi = grossEarnings × 0.0075        // 0.75% employee contribution
      ELSE:
        esi = 0 (not applicable for higher salaries)
  
  3.3 PROFESSIONAL TAX
      IF salaryStructure.includeProfTax == TRUE:
        profTax = calculateProfessionalTax(grossEarnings, state)
      
      Professional tax is state-specific and has slabs
      Example (Maharashtra):
        ≤ 10,000: ₹0
        10,001 - 25,000: ₹150
        25,001 - 50,000: ₹200
        > 50,000: ₹250
  
  3.4 OTHER PRE-TAX DEDUCTIONS
      FOR EACH deduction in employeeDeductions (PRE_TAX):
        IF deduction.amountType == FIXED:
          amount = deduction.fixedAmount
        ELSE:  // PERCENTAGE
          base = (deduction.base == GROSS) ? grossEarnings : basicAmount
          amount = base × (deduction.rate / 100)
      
        ADD to preTaxDeductionsTotal
  
  taxableIncome = grossEarnings - preTaxDeductionsTotal

════════════════════════════════════════════════════════════════

STEP 4: INCOME TAX CALCULATION (TDS)
─────────────────────────────────────
  
  4.1 ANNUALIZE SALARY (YTD tracking)
      monthsProcessed = count of payslips for current financial year
      previousMonthsTaxable = SUM(payslips[0..currentMonth-1].taxable)
      annualTaxable = taxableIncome × 12  // Projected
      annualTaxable += previousMonthsTaxable
  
  4.2 CALCULATE ANNUAL TAX
      annualTax = calculateTax(annualTaxable, taxSlabs, taxRegime)
      
      Example (India - FY 2025-26, Old Regime):
        ≤ 2,50,000: 0%
        2,50,001 - 5,00,000: 5%
        5,00,001 - 10,00,000: 20%
        > 10,00,000: 30%
      
      Add surcharge (if applicable)
      Add cess (4% on income tax, if applicable)
  
  4.3 MONTHLY EQUATED TAX
      monthlyTax = annualTax / 12
      
      ⚠️  If previous months' TDS was higher than proportionate share:
          monthlyTax = 0  (no additional TDS required)
  
  4.4 TDS ADJUSTMENT
      IF annualIncome < standardDeduction:
        // Eligible for rebate (Form 12BA)
        annualTax = 0
  
  incomeTax = monthlyTax (rounded to nearest Re)

════════════════════════════════════════════════════════════════

STEP 5: POST-TAX DEDUCTIONS (After tax calculation)
────────────────────────────────────────────────
  
  5.1 LOSS OF PAY (LOP)
      IF lopDays > 0 AND salary.includeLOP == TRUE:
        dailyRate = basicAmount / totalDays
        lop = dailyRate × lopDays
      ELSE:
        lop = 0
  
  5.2 EMPLOYEE LOANS
      FOR EACH active loan for this employee:
        emonth = loan.monthlyEMI
        ADD to postTaxDeductionsTotal
  
  5.3 ADVANCES
      FOR EACH outstanding advance:
        IF advance.repaymentMonth == currentMonth:
          ADD advance.amount to postTaxDeductionsTotal
  
  5.4 PENALTIES / DISCIPLINARY
      FOR EACH active penalty:
        ADD penalty.amount to postTaxDeductionsTotal

════════════════════════════════════════════════════════════════

STEP 6: EMPLOYER CONTRIBUTIONS (Not deducted from employee)
──────────────────────────────────────────────────
  
  These are company's liability, shown for transparency:
  
  - EPF Employer: basicAmount × 0.12
  - ESI Employer: grossEarnings × 0.0325 (if ESI applicable)
  - Gratuity Accrual: grossEarnings × 0.04833
  - Any other welfare contributions

════════════════════════════════════════════════════════════════

STEP 7: NET PAY CALCULATION
────────────────────────
  
  netPay = grossEarnings 
            - preTaxDeductionsTotal 
            - incomeTax 
            - postTaxDeductionsTotal
  
  ✅ Validation: IF netPay < 0:
     FLAG as "Negative Net Pay" - requires manual review
     DO NOT AUTO-APPROVE
  
  ✅ Rounding: Round to nearest Re (0.05 rounding)

════════════════════════════════════════════════════════════════

STEP 8: HASH VERIFICATION & STORAGE
────────────────────────────────
  
  payslipHash = SHA256(
    employeeId + payrollRunId + month + year +
    grossEarnings + taxableIncome + incomeTax + netPay +
    attendanceSummary
  )
  
  Store as immutable document with hash
  
  ✅ Future: If any value is modified, hash fails verification

════════════════════════════════════════════════════════════════
```

### Pseudocode Implementation

```javascript
/**
 * Main Payroll Calculation Engine
 * Server-side only, never callable from frontend
 */
async function calculateEmployeePayroll(
  tenantDB,
  tenantId,
  employee,
  month,
  year,
  config          // PayrollConfiguration
) {
  
  // 1. FETCH ACTIVE SALARY ASSIGNMENT
  const assignment = await SalaryAssignment.findOne({
    tenantId,
    employeeId: employee._id,
    effectiveFrom: { $lte: endDate }
  }).sort({ effectiveFrom: -1 });
  
  if (!assignment || assignment.effectiveTo < startDate) {
    throw new Error(`No active salary assignment for ${employee._id}`);
  }
  
  const salaryTemplate = await SalaryTemplate.findById(assignment.salaryTemplateId);
  
  // 2. CALCULATE ATTENDANCE SUMMARY
  const attendanceSummary = await calculateAttendanceSummary(
    tenantDB,
    employee._id,
    startDate,
    endDate
  );
  
  // 3. CALCULATE GROSS EARNINGS
  const grossCalc = calculateGrossEarnings(
    salaryTemplate.earnings,
    attendanceSummary,
    month,
    year
  );
  
  // 4. CALCULATE PRE-TAX DEDUCTIONS
  const preTax = await calculatePreTaxDeductions(
    tenantDB,
    tenantId,
    employee._id,
    grossCalc.totalGross,
    config
  );
  
  // 5. TAXABLE INCOME
  const taxableIncome = grossCalc.totalGross - preTax.total;
  
  // 6. CALCULATE INCOME TAX
  const tds = await calculateMonthlyTDS(
    taxableIncome,
    employee,
    { tenantId, month, year, config }
  );
  
  // 7. POST-TAX DEDUCTIONS
  const postTax = await calculatePostTaxDeductions(
    tenantDB,
    tenantId,
    employee._id,
    config
  );
  
  // 8. NET PAY
  const netPay = taxableIncome - tds.monthly - postTax.total;
  
  // 9. VALIDATION
  if (netPay < 0) {
    return {
      status: 'NEGATIVE_NET_PAY',
      requiresManualReview: true,
      payslip: { netPay, /* ... */ }
    };
  }
  
  // 10. EMPLOYER CONTRIBUTIONS
  const employerContribs = calculateEmployerContributions(
    salaryTemplate,
    grossCalc.basicAmount,
    config
  );
  
  // 11. CREATE PAYSLIP SNAPSHOT
  const payslip = new Payslip({
    tenantId,
    employeeId: employee._id,
    month,
    year,
    
    employeeInfo: {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      designation: employee.role,
      bankAccountNumber: employee.bankDetails?.accountNumber,
      bankIFSC: employee.bankDetails?.ifsc,
      bankName: employee.bankDetails?.bankName,
      panNumber: employee.documents?.panCard
    },
    
    earningsSnapshot: grossCalc.earningsSnapshot,
    preTaxDeductionsSnapshot: preTax.snapshot,
    postTaxDeductionsSnapshot: postTax.snapshot,
    employerContributionsSnapshot: employerContribs,
    
    grossEarnings: grossCalc.totalGross,
    preTaxDeductionsTotal: preTax.total,
    taxableIncome,
    incomeTax: tds.monthly,
    postTaxDeductionsTotal: postTax.total,
    netPay,
    
    attendanceSummary,
    
    salaryTemplateId: salaryTemplate._id,
    salaryTemplateSnapshot: {
      templateName: salaryTemplate.templateName,
      annualCTC: salaryTemplate.annualCTC,
      monthlyCTC: salaryTemplate.monthlyCTC
    },
    
    tdsSnapshot: tds,
    
    hash: generatePayslipHash({ ... }),
    
    status: netPay < 0 ? 'DISPUTED' : 'DRAFT'
  });
  
  return payslip;
}
```

---

## API SPECIFICATIONS

### 1. Initiate Payroll Run
```
POST /api/payroll/runs
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Content-Type: application/json

Request Body:
{
  "month": 1-12,
  "year": 2025,
  "reason": "Regular monthly payroll",  // Optional
  "processAllEligible": true              // Auto-select active employees
}

Response 200 OK:
{
  "success": true,
  "data": {
    "payrollRunId": "ObjectId",
    "month": 1,
    "year": 2025,
    "status": "INITIATED",
    "totalEmployees": 245,
    "initiatedBy": "HR Manager Name",
    "initiatedAt": "2025-01-15T10:30:00Z"
  }
}

Response 400 Bad Request:
{
  "success": false,
  "error": "DUPLICATE_PAYROLL",
  "message": "Payroll for January 2025 already exists in CALCULATED status. Cannot reinitiate."
}
```

### 2. Preview Payroll (Dry-Run)
```
POST /api/payroll/process/preview
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Content-Type: application/json

Request Body:
{
  "month": "2025-01",
  "items": [
    {
      "employeeId": "ObjectId",
      "salaryTemplateId": "ObjectId"  // Can override assignment
    },
    { ... }
  ]
}

Response 200 OK:
{
  "success": true,
  "data": [
    {
      "employeeId": "ObjectId",
      "employeeInfo": {
        "name": "John Doe",
        "employeeId": "EMP001",
        "department": "Engineering"
      },
      "grossEarnings": 50000,
      "preTaxDeductionsTotal": 6000,
      "taxableIncome": 44000,
      "incomeTax": 4400,
      "postTaxDeductionsTotal": 2000,
      "netPay": 37600,
      "attendanceSummary": {
        "totalDays": 30,
        "presentDays": 28,
        "leaveDays": 2,
        "lopDays": 0,
        "holidayDays": 2
      },
      "earningsSnapshot": [ ... ],
      "deductionsSnapshot": [ ... ],
      "status": "OK"
    }
  ],
  "stats": {
    "totalGross": 1250000,
    "totalTax": 110000,
    "totalNetPay": 1000000,
    "processedCount": 25,
    "errors": 0
  }
}

Response 400 Bad Request:
{
  "success": false,
  "error": "MISSING_TEMPLATE",
  "message": "Employee EMP001 missing salary template assignment"
}
```

### 3. Execute Payroll Run
```
POST /api/payroll/process/run
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Content-Type: application/json

Request Body:
{
  "month": "2025-01",
  "items": [
    {
      "employeeId": "ObjectId",
      "salaryTemplateId": "ObjectId"
    }
  ]
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll processed: 23 successful, 2 failed",
  "data": {
    "payrollRunId": "ObjectId",
    "month": 1,
    "year": 2025,
    "status": "CALCULATED",
    "totalEmployees": 25,
    "processedEmployees": 23,
    "failedEmployees": 2,
    "skippedEmployees": 0,
    "totalGross": 1250000,
    "totalNetPay": 1000000,
    "errors": [
      {
        "employeeId": "ObjectId",
        "message": "Negative net pay (₹-5000). Requires manual review.",
        "severity": "WARNING"
      }
    ]
  }
}
```

### 4. Approve Payroll
```
POST /api/payroll/runs/:payrollRunId/approve
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Content-Type: application/json

Request Body:
{
  "approvalNotes": "Reviewed and approved for processing"
}

Response 200 OK:
{
  "success": true,
  "data": {
    "payrollRunId": "ObjectId",
    "status": "APPROVED",
    "approvedBy": "Finance Manager",
    "approvedAt": "2025-01-15T15:30:00Z",
    "locked": true
  }
}

Response 403 Forbidden:
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSION",
  "message": "Only Finance/Admin can approve payroll"
}
```

### 5. Download Payslip PDF
```
GET /api/payroll/payslips/:payslipId/download
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>

Response 200 OK:
[PDF Binary Content]
Content-Type: application/pdf
Content-Disposition: attachment; filename="Payslip_01-2025_EMP001.pdf"
```

### 6. Get Payroll Summary Report
```
GET /api/payroll/runs/:payrollRunId/summary
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>

Response 200 OK:
{
  "success": true,
  "data": {
    "payrollRunId": "ObjectId",
    "month": "January 2025",
    "status": "APPROVED",
    "statistics": {
      "totalEmployees": 25,
      "processedEmployees": 23,
      "failedEmployees": 2,
      "totalGross": 1250000,
      "totalEarnings": {
        "Basic": 500000,
        "HRA": 250000,
        "Dearness Allowance": 125000,
        "Other": 375000
      },
      "totalDeductions": {
        "EPF": 60000,
        "ESI": 9375,
        "IncomeTax": 110000,
        "Loans": 15000,
        "Other": 55625
      },
      "totalNetPay": 1000000,
      "totalEmployerContributions": 75000
    }
  }
}
```

---

## COMPLIANCE & AUDIT

### Validation Engine

```javascript
async function validatePayroll(payrollRunId) {
  const validations = [];
  
  // 1. Duplicate Check
  const existing = await PayrollRun.findOne({
    tenantId,
    month,
    year,
    status: { $ne: 'CANCELLED' }
  });
  if (existing) {
    validations.push({
      rule: 'NO_DUPLICATE_RUNS',
      status: 'FAIL',
      message: 'Payroll already exists'
    });
  }
  
  // 2. Employee Eligibility
  const employeesWithoutTemplate = employees.filter(e => !e.salaryTemplateId);
  if (employeesWithoutTemplate.length > 0) {
    validations.push({
      rule: 'ALL_TEMPLATES_ASSIGNED',
      status: 'FAIL',
      count: employeesWithoutTemplate.length,
      message: `${count} employees missing salary template`
    });
  }
  
  // 3. Attendance Availability
  const missingAttendance = employees.filter(e => {
    return !hasAttendanceRecords(e._id, startDate, endDate);
  });
  if (missingAttendance.length > 0) {
    validations.push({
      rule: 'ATTENDANCE_DATA_AVAILABLE',
      status: 'WARNING',
      count: missingAttendance.length,
      message: `${count} employees with no attendance records`
    });
  }
  
  // 4. Negative Net Pay Check
  const negative = payslips.filter(p => p.netPay < 0);
  if (negative.length > 0) {
    validations.push({
      rule: 'NO_NEGATIVE_NET_PAY',
      status: 'FAIL',
      count: negative.length,
      employees: negative.map(p => ({
        id: p.employeeId,
        netPay: p.netPay
      })),
      message: `${count} employees have negative net pay`
    });
  }
  
  // 5. TDS Not Collected (Special Case)
  const noTDS = payslips.filter(p => p.taxableIncome > 250000 && p.incomeTax === 0);
  if (noTDS.length > 0) {
    validations.push({
      rule: 'UNEXPECTED_ZERO_TDS',
      status: 'WARNING',
      count: noTDS.length,
      message: `${count} employees with high income but zero TDS`
    });
  }
  
  return validations;
}
```

### Approval Workflow

```javascript
/**
 * Multi-Level Approval Workflow
 */

async function approvePayroll(payrollRunId, approvingUser) {
  const run = await PayrollRun.findById(payrollRunId);
  
  // Level 1: HR Manager
  if (approvingUser.role === 'HR') {
    if (run.status !== 'CALCULATED') {
      throw new Error('Can only approve CALCULATED payrolls');
    }
    run.hrApprovedBy = approvingUser._id;
    run.hrApprovedAt = new Date();
    run.status = 'HR_APPROVED';
  }
  
  // Level 2: Finance Manager
  else if (approvingUser.role === 'FINANCE') {
    if (run.status !== 'HR_APPROVED') {
      throw new Error('HR must approve first');
    }
    run.financeApprovedBy = approvingUser._id;
    run.financeApprovedAt = new Date();
    run.status = 'FINANCE_APPROVED';
  }
  
  // Level 3: Admin (Final)
  else if (approvingUser.role === 'ADMIN') {
    if (run.status !== 'FINANCE_APPROVED') {
      throw new Error('Finance must approve first');
    }
    run.approvedBy = approvingUser._id;
    run.approvedAt = new Date();
    run.status = 'APPROVED';
    run.locked = true;  // LOCKED from here on
  }
  
  await run.save();
  
  // Log approval action
  await AuditLog.create({
    tenantId: run.tenantId,
    entity: 'PayrollRun',
    entityId: payrollRunId,
    action: 'APPROVAL',
    performedBy: approvingUser._id,
    changes: {
      before: { status: run.status },
      after: { status: run.status }
    }
  });
}
```

### Audit Logging

```javascript
/**
 * Comprehensive Audit Trail
 * Logs ALL payroll modifications and calculations
 */

async function logPayrollAction(
  tenantId,
  payrollRunId,
  action,
  details,
  performedBy
) {
  await PayrollAuditLog.create({
    tenantId,
    payrollRunId,
    timestamp: new Date(),
    action,        // INITIATED | CALCULATED | APPROVED | PAID | DISPUTED | AMENDED
    performedBy,
    details: {
      ...details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      reason: details.reason || 'N/A'
    }
  });
}

// Example uses:
// - logPayrollAction(..., 'INITIATED', { employeeCount: 25 }, hrManagerId)
// - logPayrollAction(..., 'CALCULATED', { failedCount: 2, gross: 1250000 }, systemId)
// - logPayrollAction(..., 'APPROVED', { approvalNotes: '...' }, financeManagerId)
// - logPayrollAction(..., 'DISPUTED', { reason: 'Negative net pay' }, hrManagerId)
```

---

## EDGE CASES & HANDLING

### 1. Negative Net Pay
```javascript
// DETECTION
if (netPay < 0) {
  payslip.status = 'DISPUTED';
  payslip.requiresManualReview = true;
  
  // Notify HR
  await sendNotification({
    to: hRManager,
    type: 'NEGATIVE_NET_PAY',
    payslipId: payslip._id,
    amount: netPay
  });
  
  // Block auto-approval
  throw new Error(`Cannot auto-approve payroll with negative net pay`);
}

// RESOLUTION OPTIONS
// 1. Adjust deductions
// 2. Recalculate with corrected template
// 3. Manual override by Finance (with audit log)
```

### 2. Retroactive Salary Changes
```javascript
/**
 * Policy: Allow corrections within 30 days of payroll month
 */

async function amendPayslip(payslipId, amendments) {
  const payslip = await Payslip.findById(payslipId);
  const payrollRun = await PayrollRun.findById(payslip.payrollRunId);
  
  // Validation
  const daysElapsed = (Date.now() - payslip.createdAt) / (1000 * 86400);
  if (daysElapsed > 30 && payrollRun.status === 'PAID') {
    throw new Error('Cannot amend payslip after 30 days + payment');
  }
  
  // Create amended version (immutable original preserved)
  const amended = new AmendedPayslip({
    originalPayslipId: payslip._id,
    version: 2,
    changes: amendments,
    recalculatedValues: { ... },
    reason: amendments.reason,
    approvedBy: currentUser._id
  });
  
  await amended.save();
  
  // Audit log
  await logPayrollAction(
    payslip.tenantId,
    payslip.payrollRunId,
    'AMENDED',
    { originalPayslipId: payslip._id, amendments },
    currentUser._id
  );
}
```

### 3. Mid-Month Attendance Correction
```javascript
/**
 * When attendance is corrected after payroll calculated
 */

async function correctAttendanceAndRecalculate(
  employeeId,
  month,
  year,
  corrections
) {
  // Step 1: Check if payroll locked
  const payrollRun = await PayrollRun.findOne({ month, year });
  if (payrollRun.status === 'PAID') {
    throw new Error('Cannot recalculate after payment. Must amend.');
  }
  
  // Step 2: Update attendance
  await Attendance.updateMany(
    { employee: employeeId, date: { $gte: startDate, $lte: endDate } },
    { $set: corrections.attendanceChanges }
  );
  
  // Step 3: Recalculate payslip (with dryRun=false only if not locked)
  const newPayslip = await calculateEmployeePayroll(
    db, tenantId, employee, month, year
  );
  
  // Step 4: Mark old payslip as superseded
  await Payslip.updateOne({ _id: oldPayslipId }, {
    $set: { supersededBy: newPayslip._id }
  });
  
  // Step 5: Audit log
  await logPayrollAction(
    tenantId,
    payrollRunId,
    'RECALCULATED_DUE_TO_ATTENDANCE',
    { oldPayslipId, newPayslipId: newPayslip._id, corrections },
    currentUser._id
  );
}
```

### 4. New Joiner (Mid-Month)
```javascript
/**
 * Pro-rata calculation for joining on 15th
 */

async function handleNewJoiner(employee, joiningDate, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Effective dates for this payroll month
  const effectiveStart = MAX(startDate, joiningDate);
  const effectiveEnd = endDate;
  const workingDaysInMonth = daysBetween(effectiveStart, effectiveEnd);
  const totalDaysInMonth = daysBetween(startDate, endDate);
  
  // All earnings are pro-rata
  FOR EACH earning in template:
    amount = earning.monthlyAmount × (workingDaysInMonth / totalDaysInMonth);
  
  // Attendance is calculated only for working days
  attendanceSummary.totalDays = workingDaysInMonth;
}
```

### 5. Resignation (Mid-Month)
```javascript
async function handleResignation(employee, resignationDate, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Employee worked only until resignation date
  const effectiveEnd = resignationDate;
  const workingDaysInMonth = daysBetween(startDate, effectiveEnd);
  const totalDaysInMonth = daysBetween(startDate, endDate);
  
  // All earnings are pro-rata
  // Unpaid leave (if any) automatically becomes LOP
  const lopDays = (leaveDaysUnused || 0);
  
  FOR EACH earning in template:
    amount = earning.monthlyAmount × (workingDaysInMonth / totalDaysInMonth);
}
```

### 6. Multiple Pay Cycles (Future)
```javascript
/**
 * For bi-weekly, weekly payroll
 * Current: Monthly only
 * Future: Support for different cycles
 */

const payCycles = {
  MONTHLY: { frequency: 12 },
  BI_WEEKLY: { frequency: 26 },
  WEEKLY: { frequency: 52 },
  BI_MONTHLY: { frequency: 6 }
};

// Configuration change: payFrequency in SalaryAssignment
// Logic: Adjust calculation period dates accordingly
```

---

## CONFIGURATION & EXTENSIBILITY

### Tax Configuration Example (India)

```javascript
{
  "tenantId": "...",
  "taxRules": {
    "country": "IN",
    "taxRegime": "NEW",  // FY 2025-26
    "taxYear": 2025,
    "taxSlabs": [
      { "minIncome": 0, "maxIncome": 300000, "rate": 0 },
      { "minIncome": 300001, "maxIncome": 700000, "rate": 5 },
      { "minIncome": 700001, "maxIncome": 1000000, "rate": 10 },
      { "minIncome": 1000001, "maxIncome": 1700000, "rate": 15 },
      { "minIncome": 1700001, "maxIncome": Infinity, "rate": 30 }
    ],
    "standardDeduction": 50000,
    "rebateCap": 12500,
    "surcharge": {
      "minIncome": 5000000,
      "rate": 25  // % of tax
    },
    "cess": 4  // % of income tax
  },
  "statutoryRules": {
    "epfWageLimit": 15000,
    "epfRate": 12,
    "epfEmployerRate": 12,
    "esiLimit": 21000,
    "esiRate": 0.75,
    "esiEmployerRate": 3.25,
    "professionalTaxSlabs": [
      { "state": "MH", "slabs": [ ... ] },
      { "state": "KA", "slabs": [ ... ] }
    ]
  },
  "payrollRules": {
    "proRataMethod": "DAYS_WORKED",
    "lopRate": 0.5,  // LOP = 50% of daily rate
    "bankTransferCutoffDay": 25,
    "allowanceExemptions": {
      "HRA": {
        "basePercent": 50,  // 50% of salary
        "rentPaid": "rentActual",
        "cap": 250000
      }
    }
  }
}
```

### Extensibility for Multiple Countries

```javascript
/**
 * To add a new country:
 * 1. Create country-specific PayrollConfiguration
 * 2. Implement country-specific TDS calculator
 * 3. Define statutory deductions (EPF, ESI, Professional Tax, etc.)
 * 4. Set tax slabs and allowances
 */

// US Example
{
  "country": "US",
  "currency": "USD",
  "taxRules": {
    "federalTaxSlabs": [ ... ],  // Federal income tax
    "stateTax": {
      "CA": [ ... ],              // California-specific
      "NY": [ ... ],
      "TX": [ ... ]
    }
  },
  "statutoryRules": {
    "socialSecurityRate": 6.2,
    "medicareRate": 1.45,
    "fedWithholdingMethod": "PERCENTAGE_METHOD",
    "w4Form": "W4-2025"
  }
}

// UAE Example
{
  "country": "AE",
  "currency": "AED",
  "taxRules": {
    // UAE has no income tax
    "federalTax": 0
  },
  "statutoryRules": {
    "gratuity": {
      "rate": 8.33,  // % of salary per year
      "cap": 31.5  // Daily wage cap
    },
    "housing": {
      "percentage": 5
    }
  }
}
```

---

## DEPLOYMENT & OPERATIONS

### Performance Optimization

```javascript
/**
 * Database Indexing Strategy
 */

// 1. PayrollRun
db.payrollruns.createIndex({ tenantId: 1, month: 1, year: 1 }, { unique: true });
db.payrollruns.createIndex({ tenantId: 1, status: 1 });
db.payrollruns.createIndex({ tenantId: 1, createdAt: -1 });

// 2. Payslip
db.payslips.createIndex({ tenantId: 1, employeeId: 1, year: 1, month: 1 });
db.payslips.createIndex({ payrollRunId: 1 });
db.payslips.createIndex({ hash: 1 }, { unique: true });

// 3. SalaryAssignment
db.salaryassignments.createIndex({ tenantId: 1, employeeId: 1, effectiveFrom: -1 });

// 4. Audit Log
db.payrollauditlogs.createIndex({ tenantId: 1, payrollRunId: 1 });
db.payrollauditlogs.createIndex({ tenantId: 1, createdAt: -1 });
```

### Batch Processing for Large Payrolls

```javascript
/**
 * For 5,000+ employees, use batching
 */

async function runPayrollInBatches(payrollRunId, batchSize = 100) {
  const employees = await fetchEligibleEmployees();
  const batches = chunk(employees, batchSize);
  
  for (const batch of batches) {
    const payslips = await Promise.all(
      batch.map(emp => calculateEmployeePayroll(emp, month, year))
    );
    
    await Payslip.insertMany(payslips);
    
    // Update progress
    payrollRun.processedEmployees += payslips.length;
    await payrollRun.save();
  }
}
```

### Caching Strategy

```javascript
/**
 * Cache frequently accessed config
 */

const cache = new Map();

async function getPayrollConfig(tenantId) {
  if (cache.has(tenantId)) {
    return cache.get(tenantId);
  }
  
  const config = await PayrollConfiguration.findOne({ tenantId });
  cache.set(tenantId, config);
  
  // Invalidate after 1 hour
  setTimeout(() => cache.delete(tenantId), 3600000);
  
  return config;
}
```

---

## ASSUMPTIONS

1. **Country:** Default India (INR), with extensibility for other countries
2. **Tax Regime:** Old & New regime supported; configurable per tenant
3. **Pay Frequency:** Monthly (primary); bi-weekly/weekly as future enhancement
4. **Approval Levels:** HR → Finance → Admin (3-tier, configurable)
5. **Attendance Data:** Assumed available and locked before payroll
6. **Rounding:** HALF_UP to nearest Re (₹0.05)
7. **Lock Period:** Payroll locked 30 days post-approval
8. **Database:** MongoDB (multi-tenant with tenant isolation)
9. **Compliance:** Annual income projected monthly; YTD tracking assumed

---

## NEXT STEPS

1. ✅ Database schema validation
2. ⚠️ Enhanced validation engine implementation
3. ⚠️ Multi-level approval workflow
4. ⚠️ Payslip PDF template enhancement
5. ❌ Bank transfer file generation
6. ❌ Accounting GL entry generation
7. ❌ Compliance reporting module

---

**Document Owner:** Senior Payroll Architect  
**Last Updated:** January 2026  
**Version:** 1.0 (Production)
