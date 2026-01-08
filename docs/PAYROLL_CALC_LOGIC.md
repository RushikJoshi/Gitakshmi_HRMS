# Payroll Calculation Order & Logic

This document outlines the critical sequence of operations for payroll processing within the multi-tenant HRMS.

## Calculation Order (Mandatory)

1. **Gross Earnings**
   - Sum of all configured Earnings (Basic, HRA, Allowances, etc.).
   - Attendance-based pro-rata applied if configured.

2. **Pre-Tax Deductions (PRE_TAX)**
   - Subtract these components from Gross Earnings.
   - Example: Employee PF, NPS, Insurance.
   - **Result:** Taxable Income = Gross Earnings - Pre-Tax Deductions.

3. **Tax Calculation (TDS)**
   - Calculate Income Tax based on the **Taxable Income** derived in step 2.
   - Consider employee tax regime and investments.

4. **Post-Tax Deductions (POST_TAX)**
   - Subtract these components from the balance remaining.
   - Example: Notice Pay, Loan EMI, LOP, Penalties.
   - These do NOT reduce the tax liability.

5. **Net Pay**
   - Final Amount = (Taxable Income - TDS) - Post-Tax Deductions.

---

## Pseudo-code

```javascript
/**
 * processes payroll for a specific month
 * @param {string} tenantId - Mandatory tenant context
 * @param {string} employeeId - Target employee
 */
async function calculateNetPay(tenantId, employeeId, period) {
    // 1. Fetch Tenant Context Components
    const earnings = await SalaryComponent.find({ tenantId, type: 'EARNING', isActive: true });
    const masterDeductions = await DeductionMaster.find({ tenantId, isActive: true });
    const employeeDeductions = await EmployeeDeduction.find({ 
        tenantId, 
        employeeId, 
        status: 'ACTIVE' 
    }).populate('deductionId');

    // 2. Fetch Attendance (for pro-rata)
    const attendance = await getAttendance(tenantId, employeeId, period);

    // 3. Gross Earnings
    let grossEarnings = 0;
    for (const e of earnings) {
        let value = e.calculationType === 'FLAT_AMOUNT' ? e.amount : (basic * e.percentage / 100);
        if (e.isProRataBasis) {
            value = (value / daysInMonth) * attendance.presentDays;
        }
        grossEarnings += value;
    }

    // 4. Pre-Tax Deductions
    let preTaxTotal = 0;
    const preTaxList = employeeDeductions.filter(d => d.deductionId.deductionCategory === 'PRE_TAX');
    
    for (const d of preTaxList) {
        let amt = calculateDeductionAmt(d, grossEarnings, basic);
        preTaxTotal += amt;
    }

    // 5. Taxable Income
    const taxableIncome = grossEarnings - preTaxTotal;

    // 6. Tax Calculation (TDS)
    const tds = calculateTDS(taxableIncome, employeeTaxRegime);

    // 7. Post-Tax Deductions
    let postTaxTotal = 0;
    const postTaxList = employeeDeductions.filter(d => d.deductionId.deductionCategory === 'POST_TAX');

    for (const d of postTaxList) {
        let amt = calculateDeductionAmt(d, grossEarnings, basic);
        postTaxTotal += amt;
        
        // Handle One-time deduction cleanup
        if (d.deductionId.frequency === 'ONE_TIME') {
            await markDeductionAsCompleted(d._id);
        }
    }

    // 8. Final Net Pay
    const netPay = (taxableIncome - tds) - postTaxTotal;

    return {
        gross: grossEarnings,
        taxable: taxableIncome,
        tds,
        net: netPay
    };
}

function calculateDeductionAmt(d, gross, basic) {
    const master = d.deductionId;
    const baseValue = d.customValue || master.value;
    
    if (master.calculationType === 'FLAT') return baseValue;
    
    const baseAmount = master.calculationBase === 'BASIC' ? basic : gross;
    return (baseAmount * baseValue / 100);
}
```

## Multi-tenant Isolation Logic

1. **Mandatory `tenantId`**: Every query to `DeductionMaster` and `EmployeeDeduction` MUST include `{ tenantId }`.
2. **Schema Level**: TenantId is an `ObjectId` with a ref to `Tenant` model, indexed for performance.
3. **Middleware Enforcement**: The backend uses `tenantMiddleware` to extract `tenantId` from headers (`X-Tenant-ID` or JWT claims) and attach it to `req.tenantId`.
4. **Namespace Safety**: One tenant can name a deduction "Employee PF" and another can also use "Employee PF" without conflict.
