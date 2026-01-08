/**
 * Payroll Calculator Service
 * Calculates salary breakdown based on Annual CTC and Company Rules
 */
class PayrollCalculator {
    constructor(rules) {
        this.rules = rules;
    }

    /**
     * Calculate Salary Breakdown
     * @param {Number} annualCTC 
     */
    calculate(annualCTC) {
        const monthlyCTC = annualCTC / 12;

        let breakdown = {
            earnings: {},
            deductions: {},
            employerContributions: {},
            totals: {}
        };

        // 1. Basic Salary
        const basicPercent = this.rules.basicSalary?.percentageOfCTC || 40;
        let basicYearly = (annualCTC * basicPercent) / 100;

        // Validation: Basic should not exceed certain logical limits (optional config)
        // For now, straightforward percentage
        breakdown.earnings.basic = {
            yearly: basicYearly,
            monthly: basicYearly / 12
        };

        // 2. HRA
        const hraPercent = this.rules.hra?.percentageOfBasic || 40;
        let hraYearly = (basicYearly * hraPercent) / 100;
        breakdown.earnings.hra = {
            yearly: hraYearly,
            monthly: hraYearly / 12
        };

        // 3. Conveyance & Medical
        let conveyanceMonthly = 0;
        if (this.rules.conveyance?.enabled) {
            if (this.rules.conveyance.type === 'PERCENTAGE') {
                conveyanceMonthly = (basicYearly / 12) * (this.rules.conveyance.value || 0) / 100;
            } else {
                conveyanceMonthly = this.rules.conveyance.value || 0;
            }
        }

        let medicalMonthly = 0;
        if (this.rules.medical?.enabled) {
            if (this.rules.medical.type === 'PERCENTAGE') {
                medicalMonthly = (basicYearly / 12) * (this.rules.medical.value || 0) / 100;
            } else {
                medicalMonthly = this.rules.medical.value || 0;
            }
        }

        // Rounding
        conveyanceMonthly = Math.round(conveyanceMonthly);
        medicalMonthly = Math.round(medicalMonthly);

        breakdown.earnings.conveyance = {
            monthly: conveyanceMonthly,
            yearly: conveyanceMonthly * 12
        };
        breakdown.earnings.medical = {
            monthly: medicalMonthly,
            yearly: medicalMonthly * 12
        };

        // 4. Employer PF Calculation
        // Rule: 12% of Basic, capped at 15000/month if configured
        let pfBasisMonthly = breakdown.earnings.basic.monthly;
        if (this.rules.pf?.capContribution && pfBasisMonthly > (this.rules.pf.wageCeiling || 15000)) {
            pfBasisMonthly = this.rules.pf.wageCeiling || 15000;
        }

        let employerPFMonthly = 0;
        let employeePFMonthly = 0;

        if (this.rules.pf?.enabled) {
            employerPFMonthly = Math.round(pfBasisMonthly * (this.rules.pf.employerRate || 12) / 100);
            employeePFMonthly = Math.round(pfBasisMonthly * (this.rules.pf.employeeRate || 12) / 100);
        }

        breakdown.employerContributions.pfEmployer = {
            monthly: employerPFMonthly,
            yearly: employerPFMonthly * 12
        };
        breakdown.deductions.pfEmployee = {
            monthly: employeePFMonthly,
            yearly: employeePFMonthly * 12
        };

        // 5. Special Allowance (Balancing Component)
        // We initially assume NO ESIC to find the balancing figure.
        // Formula: CTC = (Basic + HRA + Conv + Med + Special) + EmployerPF + EmployerESIC
        // Special = CTC - (Known Earnings + EmployerPF + EmployerESIC)
        // Since ESIC depends on Gross (which includes Special), we solve algebraically or iteratively.

        // Step 5a: Partial Total (Everything except Special and ESIC)
        let knownEarningsMonthly =
            breakdown.earnings.basic.monthly +
            breakdown.earnings.hra.monthly +
            breakdown.earnings.conveyance.monthly +
            breakdown.earnings.medical.monthly;

        let employerCostsMonthly = employerPFMonthly; // ESIC not added yet

        // Preliminary Special (assuming no ESIC)
        let specialMonthly = monthlyCTC - (knownEarningsMonthly + employerCostsMonthly);
        if (specialMonthly < 0) specialMonthly = 0; // Boundary condition

        let grossMonthly = knownEarningsMonthly + specialMonthly;

        // 6. ESIC Calculation
        let employerESICMonthly = 0;
        let employeeESICMonthly = 0;

        // Check Eligibility
        const esicCeiling = this.rules.esic?.wageCeiling || 21000;
        // Strict Rule: ESIC applicable if Gross <= ceiling. 
        // Note: Special Allowance increases Gross. 
        // If the preliminary gross is <= 21000, we apply ESIC.
        if (this.rules.esic?.enabled && grossMonthly <= esicCeiling) {
            // Recalculate Special Allowance considering ESIC cost
            // Let G = Gross (Earnings)
            // CTC = G + EmployerPF + EmployerESIC
            // G = KnownEarnings + Special
            // EmployerESIC = 3.25% of G
            // CTC = (Known + Special) + EmployerPF + 0.0325 * (Known + Special)
            // CTC - EmployerPF = (Known + Special) * (1.0325)
            // (Known + Special) = (CTC - EmployerPF) / 1.0325
            // Special = [ (CTC - EmployerPF) / 1.0325 ] - Known

            const employerESICRate = (this.rules.esic.employerRate || 3.25) / 100;
            const targetGross = (monthlyCTC - employerPFMonthly) / (1 + employerESICRate);

            // Recalculate Special
            specialMonthly = targetGross - knownEarningsMonthly;
            if (specialMonthly < 0) specialMonthly = 0;

            // Final Gross
            grossMonthly = knownEarningsMonthly + specialMonthly;

            // Calculate ESIC amounts
            employerESICMonthly = Math.ceil(grossMonthly * employerESICRate);
            const employeeESICRate = (this.rules.esic.employeeRate || 0.75) / 100;
            employeeESICMonthly = Math.ceil(grossMonthly * employeeESICRate);
        }

        breakdown.earnings.specialAllowance = {
            monthly: Math.round(specialMonthly),
            yearly: Math.round(specialMonthly * 12)
        };

        breakdown.employerContributions.esicEmployer = {
            monthly: employerESICMonthly,
            yearly: employerESICMonthly * 12
        };

        breakdown.deductions.esicEmployee = {
            monthly: employeeESICMonthly,
            yearly: employeeESICMonthly * 12
        };

        // 7. Professional Tax (Simple)
        const ptMonthly = this.rules.professionalTax?.enabled ? (this.rules.professionalTax.defaultAmount || 200) : 0;
        breakdown.deductions.professionalTax = {
            monthly: ptMonthly,
            yearly: ptMonthly * 12
        };

        // 8. Final Aggregations
        breakdown.totals.gross = {
            monthly: grossMonthly,
            yearly: grossMonthly * 12
        };

        const totalDeductionsMonthly = employeePFMonthly + employeeESICMonthly + ptMonthly;
        breakdown.totals.totalDeductions = {
            monthly: totalDeductionsMonthly,
            yearly: totalDeductionsMonthly * 12
        };

        const netPayMonthly = grossMonthly - totalDeductionsMonthly;
        breakdown.totals.netPay = {
            monthly: netPayMonthly,
            yearly: netPayMonthly * 12
        };

        const totalCTCMonthly = grossMonthly + employerPFMonthly + employerESICMonthly;
        breakdown.totals.ctc = {
            monthly: totalCTCMonthly,
            yearly: totalCTCMonthly * 12
        };

        return breakdown;
    }

    /**
     * Calculate Statutory Components based on provided Earnings
     * Use this to validate/enforce rules on manually edited structures
     * @param {Object} monthlyEarnings { basic: 5000, gross: 12000, ... }
     */
    calculateStatutory(monthlyEarnings) {
        const basic = monthlyEarnings.basic || 0;
        const gross = monthlyEarnings.gross || 0;

        // 1. PF Calculation
        let pfBasis = basic;
        if (this.rules.pf?.capContribution && pfBasis > (this.rules.pf.wageCeiling || 15000)) {
            pfBasis = this.rules.pf.wageCeiling || 15000;
        }

        let employerPF = 0;
        let employeePF = 0;

        if (this.rules.pf?.enabled) {
            employerPF = Math.round(pfBasis * (this.rules.pf.employerRate || 12) / 100);
            employeePF = Math.round(pfBasis * (this.rules.pf.employeeRate || 12) / 100);
        }

        // 2. ESIC Calculation
        let employerESIC = 0;
        let employeeESIC = 0;
        const esicCeiling = this.rules.esic?.wageCeiling || 21000;

        // Check Eligibility (strict rule: Gross <= 21000)
        if (this.rules.esic?.enabled && gross <= esicCeiling) {
            const empRate = (this.rules.esic.employerRate || 3.25) / 100;
            const emplyRate = (this.rules.esic.employeeRate || 0.75) / 100;

            employerESIC = Math.ceil(gross * empRate);
            employeeESIC = Math.ceil(gross * emplyRate);
        }

        // 3. PT Calculation (Simple Default)
        const pt = this.rules.professionalTax?.enabled ? (this.rules.professionalTax.defaultAmount || 200) : 0;

        return {
            pf: { employee: employeePF, employer: employerPF },
            esic: { employee: employeeESIC, employer: employerESIC },
            pt: pt
        };
    }
}

module.exports = PayrollCalculator;
