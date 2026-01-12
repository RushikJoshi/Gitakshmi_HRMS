# PAYROLL API & CONFIGURATION GUIDE

## API ENDPOINTS SUMMARY

| Endpoint | Method | Purpose | Role Required |
|----------|--------|---------|----------------|
| `/api/payroll/config` | GET/POST | Manage payroll configuration | ADMIN |
| `/api/payroll/runs` | POST | Initiate payroll run | HR |
| `/api/payroll/runs` | GET | List all payroll runs | HR |
| `/api/payroll/runs/:id` | GET | Get payroll run details | HR |
| `/api/payroll/runs/:id/validate` | POST | Pre-flight validation | HR |
| `/api/payroll/process/preview` | POST | Dry-run calculation | HR |
| `/api/payroll/process/run` | POST | Execute payroll | HR |
| `/api/payroll/runs/:id/approve` | POST | Approve payroll (HR) | HR |
| `/api/payroll/runs/:id/finance-approve` | POST | Approve payroll (Finance) | FINANCE |
| `/api/payroll/runs/:id/admin-approve` | POST | Final approval (Admin) | ADMIN |
| `/api/payroll/runs/:id/mark-paid` | POST | Mark as paid | ADMIN |
| `/api/payroll/payslips` | GET | List all payslips | HR |
| `/api/payroll/payslips/:id` | GET | Get payslip details | HR/EMPLOYEE (self) |
| `/api/payroll/payslips/:id/download` | GET | Download payslip PDF | HR/EMPLOYEE (self) |
| `/api/payroll/runs/:id/summary` | GET | Payroll summary report | HR/FINANCE |
| `/api/payroll/runs/:id/audit-log` | GET | Audit trail | ADMIN |

---

## DETAILED ENDPOINT SPECIFICATIONS

### 1. PAYROLL CONFIGURATION

#### GET /api/payroll/config
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>

Response 200 OK:
{
  "success": true,
  "data": {
    "tenantId": "...",
    "taxRules": {
      "country": "IN",
      "currency": "INR",
      "taxRegime": "NEW",
      "taxSlabs": [...]
    },
    "statutoryRules": {
      "epf": {...},
      "esi": {...},
      "professionalTax": {...}
    },
    "payrollRules": {
      "proRataMethod": "DAYS_WORKED",
      "lopRate": 1.0,
      "bankTransferCutoffDay": 25
    },
    "complianceSettings": {
      "lockPeriodDays": 30,
      "approvalLevels": "TRIPLE",
      "enableDetailedAudit": true
    }
  }
}
```

#### POST /api/payroll/config
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Content-Type: application/json
Role Required: ADMIN

Request Body:
{
  "taxRules": {
    "country": "IN",
    "currency": "INR",
    "taxRegime": "NEW",
    "standardDeduction": 50000,
    "taxSlabs": [
      {
        "minIncome": 0,
        "maxIncome": 300000,
        "rate": 0
      },
      {
        "minIncome": 300001,
        "maxIncome": 700000,
        "rate": 5
      },
      {
        "minIncome": 700001,
        "maxIncome": 1000000,
        "rate": 10
      },
      {
        "minIncome": 1000001,
        "maxIncome": 1700000,
        "rate": 15
      },
      {
        "minIncome": 1700001,
        "maxIncome": Infinity,
        "rate": 30
      }
    ]
  },
  "statutoryRules": {
    "epf": {
      "enabled": true,
      "employeeRate": 12,
      "employerRate": 12,
      "wageLimit": 15000,
      "applyWageRestriction": true
    },
    "esi": {
      "enabled": true,
      "employeeRate": 0.75,
      "employerRate": 3.25,
      "wageLimit": 21000
    }
  },
  "payrollRules": {
    "proRataMethod": "DAYS_WORKED",
    "lopRate": 1.0,
    "bankTransferCutoffDay": 25,
    "minimumAttendanceForFullSalary": 80,
    "roundingMethod": "HALF_UP"
  },
  "complianceSettings": {
    "lockPeriodDays": 30,
    "approvalLevels": "TRIPLE",
    "allowAmendmentAfterPayment": false,
    "amendmentAllowanceDays": 30
  }
}

Response 200 OK:
{
  "success": true,
  "message": "Configuration saved successfully",
  "data": { ... }
}
```

---

### 2. INITIATE PAYROLL RUN

#### POST /api/payroll/runs
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: HR
Content-Type: application/json

Request Body:
{
  "month": 1,          // 1-12
  "year": 2025,
  "reason": "Regular monthly payroll",
  "processAllEligible": true
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll run initiated successfully",
  "data": {
    "payrollRunId": "507f1f77bcf86cd799439011",
    "month": 1,
    "year": 2025,
    "status": "INITIATED",
    "totalEmployees": 245,
    "initiatedBy": {
      "id": "...",
      "name": "John Doe"
    },
    "initiatedAt": "2025-01-15T10:30:00Z"
  }
}

Response 400 Bad Request:
{
  "success": false,
  "error": "DUPLICATE_PAYROLL",
  "message": "Payroll for January 2025 already exists in CALCULATED status"
}

Response 403 Forbidden:
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSION",
  "message": "Only HR and Admin roles can initiate payroll"
}
```

---

### 3. VALIDATE PAYROLL

#### POST /api/payroll/runs/:id/validate
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: HR
Content-Type: application/json

Response 200 OK:
{
  "success": true,
  "data": {
    "payrollRunId": "507f1f77bcf86cd799439011",
    "canProceed": true,
    "validationResults": [
      {
        "rule": "NO_DUPLICATE_RUNS",
        "severity": "INFO",
        "status": "PASS",
        "message": "No existing payroll for this month"
      },
      {
        "rule": "ELIGIBLE_EMPLOYEES_FETCH",
        "severity": "INFO",
        "status": "PASS",
        "message": "Found 245 eligible employees"
      },
      {
        "rule": "ALL_TEMPLATES_ASSIGNED",
        "severity": "ERROR",
        "status": "FAIL",
        "message": "5 employees missing active salary template",
        "metadata": {
          "count": 5,
          "employees": [
            {"_id": "...", "employeeId": "EMP001", "name": "John Doe"}
          ]
        }
      }
    ],
    "summary": {
      "totalChecks": 6,
      "passed": 5,
      "warnings": 1,
      "errors": 0
    }
  }
}
```

---

### 4. PREVIEW PAYROLL (DRY-RUN)

#### POST /api/payroll/process/preview
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: HR
Content-Type: application/json

Request Body:
{
  "month": "2025-01",  // YYYY-MM format
  "items": [
    {
      "employeeId": "507f1f77bcf86cd799439011",
      "salaryTemplateId": "507f1f77bcf86cd799439012"
    },
    { ... }
  ]
}

Response 200 OK:
{
  "success": true,
  "message": "Preview calculated successfully",
  "data": [
    {
      "employeeId": "507f1f77bcf86cd799439011",
      "employeeInfo": {
        "employeeId": "EMP001",
        "name": "John Doe",
        "department": "Engineering",
        "designation": "Senior Developer",
        "bankName": "ICICI Bank",
        "bankAccountNumber": "****6789"
      },
      "earningsSnapshot": [
        {
          "name": "Basic Salary",
          "amount": 40000,
          "isProRata": false,
          "originalAmount": 40000
        },
        {
          "name": "House Rent Allowance",
          "amount": 10000,
          "isProRata": false
        }
      ],
      "grossEarnings": 50000,
      "preTaxDeductionsSnapshot": [
        {
          "name": "Employee Provident Fund (EPF)",
          "amount": 4800,
          "category": "EPF"
        },
        {
          "name": "Employee State Insurance (ESI)",
          "amount": 375,
          "category": "ESI"
        }
      ],
      "preTaxDeductionsTotal": 5175,
      "taxableIncome": 44825,
      "incomeTax": 0,
      "tdsSnapshot": {
        "annualTaxable": 537900,
        "annualTax": 0,
        "monthly": 0,
        "regime": "NEW"
      },
      "postTaxDeductionsSnapshot": [
        {
          "name": "Loan EMI",
          "amount": 2000,
          "category": "LOAN"
        }
      ],
      "postTaxDeductionsTotal": 2000,
      "netPay": 42825,
      "attendanceSummary": {
        "totalDays": 31,
        "presentDays": 28,
        "leaveDays": 2,
        "lopDays": 0,
        "holidayDays": 1
      },
      "status": "OK"
    }
  ],
  "stats": {
    "totalGross": 1250000,
    "totalNetPay": 1000000,
    "processedCount": 25,
    "errors": 0
  }
}

Response 400 Bad Request:
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "5 employees missing salary templates",
  "data": {
    "failedEmployees": [
      {"employeeId": "EMP001", "reason": "MISSING_TEMPLATE"}
    ]
  }
}
```

---

### 5. EXECUTE PAYROLL

#### POST /api/payroll/process/run
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: HR
Content-Type: application/json

Request Body:
{
  "month": "2025-01",
  "items": [
    {
      "employeeId": "507f1f77bcf86cd799439011",
      "salaryTemplateId": "507f1f77bcf86cd799439012"
    }
  ]
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll processed: 245 successful, 5 failed",
  "data": {
    "payrollRunId": "507f1f77bcf86cd799439011",
    "month": 1,
    "year": 2025,
    "status": "CALCULATED",
    "totalEmployees": 250,
    "processedEmployees": 245,
    "failedEmployees": 5,
    "skippedEmployees": 0,
    "totalGross": 12500000,
    "totalDeductions": 2500000,
    "totalNetPay": 10000000,
    "errors": [
      {
        "employeeId": "EMP001",
        "message": "Negative net pay (₹-5000). Requires manual review.",
        "severity": "WARNING"
      }
    ]
  }
}
```

---

### 6. APPROVE PAYROLL (Multi-Level)

#### POST /api/payroll/runs/:id/approve (HR Level)
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: HR
Content-Type: application/json

Request Body:
{
  "approvalNotes": "Reviewed salary templates and attendance records - all correct"
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll approved by HR",
  "data": {
    "payrollRunId": "...",
    "status": "HR_APPROVED",
    "hrApprovedBy": "...",
    "hrApprovedAt": "2025-01-15T14:00:00Z",
    "nextApprover": "Finance Manager"
  }
}
```

#### POST /api/payroll/runs/:id/finance-approve (Finance Level)
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: FINANCE
Content-Type: application/json

Request Body:
{
  "approvalNotes": "Verified calculations and bank account details"
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll approved by Finance",
  "data": {
    "payrollRunId": "...",
    "status": "FINANCE_APPROVED",
    "financeApprovedBy": "...",
    "financeApprovedAt": "2025-01-15T15:00:00Z",
    "nextApprover": "Admin"
  }
}
```

#### POST /api/payroll/runs/:id/admin-approve (Admin Final)
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: ADMIN
Content-Type: application/json

Request Body:
{
  "approvalNotes": "Final approval - ready for bank transfer"
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll fully approved and locked",
  "data": {
    "payrollRunId": "...",
    "status": "APPROVED",
    "approvedBy": "...",
    "approvedAt": "2025-01-15T16:00:00Z",
    "locked": true,
    "lockExpiresAt": "2025-02-14T16:00:00Z"
  }
}
```

---

### 7. MARK PAYROLL AS PAID

#### POST /api/payroll/runs/:id/mark-paid
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: ADMIN
Content-Type: application/json

Request Body:
{
  "bankTransferDate": "2025-01-25",
  "bankTransferReferenceNo": "NEFT20250125001234",
  "totalTransferred": 10000000,
  "notes": "Salary transferred via NEFT"
}

Response 200 OK:
{
  "success": true,
  "message": "Payroll marked as paid",
  "data": {
    "payrollRunId": "...",
    "status": "PAID",
    "paidAt": "2025-01-25T08:30:00Z",
    "bankTransferReferenceNo": "NEFT20250125001234"
  }
}
```

---

### 8. DOWNLOAD PAYSLIP PDF

#### GET /api/payroll/payslips/:id/download
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>

Response 200 OK:
[PDF Binary Content]
Content-Type: application/pdf
Content-Disposition: attachment; filename="Payslip_01-2025_EMP001.pdf"
```

---

### 9. PAYROLL SUMMARY REPORT

#### GET /api/payroll/runs/:id/summary
```
Authorization: Bearer <token>
X-Tenant-ID: <tenantId>
Role Required: HR/FINANCE

Response 200 OK:
{
  "success": true,
  "data": {
    "payrollRunId": "...",
    "month": "January",
    "year": 2025,
    "status": "APPROVED",
    
    "employeeSummary": {
      "total": 250,
      "processed": 245,
      "failed": 5
    },
    
    "financialSummary": {
      "totalGross": 12500000,
      "totalPretaxDeductions": 1500000,
      "totalTax": 850000,
      "totalPostTaxDeductions": 150000,
      "totalNetPay": 10000000,
      "totalEmployerContributions": 500000
    },
    
    "earningsBreakdown": {
      "Basic Salary": 5000000,
      "House Rent Allowance": 1250000,
      "Dearness Allowance": 625000,
      "Conveyance": 312500,
      "Other": 4312500
    },
    
    "deductionsBreakdown": {
      "EPF": 750000,
      "ESI": 187500,
      "Income Tax": 850000,
      "Professional Tax": 62500,
      "Loans": 150000
    },
    
    "bankTransferDetails": {
      "totalAmount": 10000000,
      "employeeCount": 245,
      "byBank": {
        "ICICI Bank": { "count": 120, "amount": 5000000 },
        "HDFC Bank": { "count": 80, "amount": 3500000 },
        "Axis Bank": { "count": 45, "amount": 1500000 }
      }
    }
  }
}
```

---

## PAYROLL CONFIGURATION EXAMPLES

### Example 1: India (Default)
```json
{
  "taxRules": {
    "country": "IN",
    "currency": "INR",
    "taxRegime": "NEW",
    "taxYearStart": "04-01",
    "taxYearEnd": "03-31",
    "standardDeduction": 50000,
    "rebateSection87A": {
      "maxIncome": 500000,
      "rebateAmount": 12500
    },
    "taxSlabs": [
      {"minIncome": 0, "maxIncome": 300000, "rate": 0},
      {"minIncome": 300001, "maxIncome": 700000, "rate": 5},
      {"minIncome": 700001, "maxIncome": 1000000, "rate": 10},
      {"minIncome": 1000001, "maxIncome": 1700000, "rate": 15},
      {"minIncome": 1700001, "maxIncome": 999999999, "rate": 30}
    ]
  },
  "statutoryRules": {
    "epf": {
      "enabled": true,
      "employeeRate": 12,
      "employerRate": 12,
      "wageLimit": 15000
    },
    "esi": {
      "enabled": true,
      "employeeRate": 0.75,
      "employerRate": 3.25,
      "wageLimit": 21000
    },
    "professionalTax": {
      "enabled": true,
      "stateWise": [
        {
          "state": "MH",
          "slabs": [
            {"minIncome": 0, "maxIncome": 10000, "amount": 0},
            {"minIncome": 10001, "maxIncome": 25000, "amount": 150},
            {"minIncome": 25001, "maxIncome": 50000, "amount": 200},
            {"minIncome": 50001, "maxIncome": 999999999, "amount": 250}
          ]
        }
      ]
    }
  }
}
```

### Example 2: USA (Future)
```json
{
  "taxRules": {
    "country": "US",
    "currency": "USD",
    "taxYearStart": "01-01",
    "taxYearEnd": "12-31",
    "federalTaxSlabs": [
      {"minIncome": 0, "maxIncome": 11600, "rate": 10},
      {"minIncome": 11601, "maxIncome": 47150, "rate": 12},
      {"minIncome": 47151, "maxIncome": 100525, "rate": 22}
    ],
    "stateTax": {
      "CA": [...],
      "NY": [...]
    }
  },
  "statutoryRules": {
    "socialSecurity": {
      "employeeRate": 6.2,
      "employerRate": 6.2,
      "wageBase": 168600
    },
    "medicare": {
      "employeeRate": 1.45,
      "employerRate": 1.45,
      "additionalTax": 0.9
    }
  }
}
```

---

## ERROR CODES & HANDLING

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| DUPLICATE_PAYROLL | 400 | Payroll already exists for month |
| MISSING_TEMPLATE | 400 | Employee missing salary template |
| NEGATIVE_NET_PAY | 400 | Payslip has negative net pay |
| INSUFFICIENT_PERMISSION | 403 | User role insufficient |
| PAYROLL_LOCKED | 403 | Payroll is locked, no modifications allowed |
| AMENDMENT_WINDOW_CLOSED | 403 | Amendment window (30 days) has expired |
| VALIDATION_FAILED | 400 | Pre-flight validation failed |
| INSUFFICIENT_DATA | 400 | Missing required data (config, attendance, etc.) |

---

## BEST PRACTICES

1. **Always Validate Before Running**: Use `/validate` endpoint before execution
2. **Use Preview for Verification**: Use `/preview` endpoint to review calculations
3. **Multi-Level Approvals**: Follow approval workflow strictly
4. **Immutable Once Locked**: Do not attempt modifications after approval
5. **Audit Everything**: All actions are logged and auditable
6. **Amendment Procedure**: Use amendment endpoints, never direct DB updates
7. **Configuration Review**: Review tax rules annually
8. **Attendance Data**: Ensure attendance is locked before payroll
9. **Backup Payslips**: Store PDFs for compliance
10. **Year-End Audit**: Reconcile YTD calculations against tax filings

