/**
 * ============================================
 * PAYROLL CALCULATOR - SINGLE SOURCE OF TRUTH
 * ============================================
 * 
 * CORE RULES:
 * 1. HR enters ONLY CTC (Annual or Monthly)
 * 2. System calculates EVERYTHING automatically
 * 3. Calculation order is STRICT and NON-NEGOTIABLE
 * 4. Frontend NEVER calculates - Backend is authority
 * 5. Excel formulas = HRMS formulas (100% match)
 */

class PayrollCalculator {
    /**
     * Calculate complete salary breakdown from CTC
     * @param {Object} params
     * @param {Number} params.annualCTC - Annual CTC (required)
     * @param {Object} params.components - Component configuration (optional overrides)
     * @returns {Object} Complete salary snapshot
     */
    static calculateSalaryBreakup({ annualCTC, components = {} }) {
        // ============================================
        // VALIDATION
        // ============================================
        if (!annualCTC || isNaN(annualCTC) || annualCTC <= 0) {
            throw new Error('Valid Annual CTC is required');
        }

        // ============================================
        // STEP 1: NORMALIZE CTC
        // ============================================
        const monthlyCTC = Math.round((annualCTC / 12) * 100) / 100;

        // ============================================
        // STEP 2: CALCULATE BASIC (ALWAYS FIRST)
        // ============================================
        const basicPercentage = components.basicPercentage || 0.40; // 40% of CTC
        const basicMonthly = Math.round((monthlyCTC * basicPercentage) * 100) / 100;
        const basicYearly = Math.round((basicMonthly * 12) * 100) / 100;

        // ============================================
        // STEP 3: CALCULATE EARNINGS
        // ============================================
        const earnings = [];

        // Basic Salary
        earnings.push({
            name: 'Basic Salary',
            code: 'BASIC',
            monthlyAmount: basicMonthly,
            annualAmount: basicYearly,
            formula: 'CTC × 40%',
            calculationType: 'PERCENTAGE_OF_CTC',
            percentage: 40
        });

        // HRA (40% of Basic)
        const hraPercentage = components.hraPercentage || 0.40;
        const hraMonthly = Math.round((basicMonthly * hraPercentage) * 100) / 100;
        const hraYearly = Math.round((hraMonthly * 12) * 100) / 100;
        earnings.push({
            name: 'House Rent Allowance',
            code: 'HRA',
            monthlyAmount: hraMonthly,
            annualAmount: hraYearly,
            formula: 'Basic × 40%',
            calculationType: 'PERCENTAGE_OF_BASIC',
            percentage: 40
        });

        // Fixed Allowances (configurable)
        const fixedAllowances = [
            { name: 'Medical Allowance', code: 'MEDICAL', monthly: components.medical || 1250 },
            { name: 'Conveyance Allowance', code: 'CONVEYANCE', monthly: components.conveyance || 1600 },
            { name: 'Education Allowance', code: 'EDUCATION', monthly: components.education || 100 },
            { name: 'Books & Periodicals', code: 'BOOKS', monthly: components.books || 0 },
            { name: 'Uniform Allowance', code: 'UNIFORM', monthly: components.uniform || 0 },
            { name: 'Mobile Allowance', code: 'MOBILE', monthly: components.mobile || 0 },
            { name: 'Transport Allowance', code: 'TRANSPORT', monthly: components.transport || 0 }
        ];

        fixedAllowances.forEach(allowance => {
            if (allowance.monthly > 0) {
                const monthly = Math.round(allowance.monthly * 100) / 100;
                const yearly = Math.round((monthly * 12) * 100) / 100;
                earnings.push({
                    name: allowance.name,
                    code: allowance.code,
                    monthlyAmount: monthly,
                    annualAmount: yearly,
                    formula: `₹${monthly} fixed`,
                    calculationType: 'FLAT_AMOUNT'
                });
            }
        });

        // ============================================
        // STEP 4: CALCULATE EMPLOYER BENEFITS (CTC COMPONENTS)
        // ============================================
        const benefits = [];

        // Employer PF (11% of Basic) - MANDATORY
        const employerPFPercentage = components.employerPFPercentage || 0.11;
        const employerPFMonthly = Math.round((basicMonthly * employerPFPercentage) * 100) / 100;
        const employerPFYearly = Math.round((employerPFMonthly * 12) * 100) / 100;
        benefits.push({
            name: 'Employer PF Contribution',
            code: 'EMPLOYER_PF',
            monthlyAmount: employerPFMonthly,
            annualAmount: employerPFYearly,
            formula: 'Basic × 11%',
            calculationType: 'PERCENTAGE_OF_BASIC',
            percentage: 11
        });

        // Gratuity (4.81% of Basic) - MANDATORY
        const gratuityPercentage = components.gratuityPercentage || 0.0481;
        const gratuityMonthly = Math.round((basicMonthly * gratuityPercentage) * 100) / 100;
        const gratuityYearly = Math.round((gratuityMonthly * 12) * 100) / 100;
        benefits.push({
            name: 'Gratuity',
            code: 'GRATUITY',
            monthlyAmount: gratuityMonthly,
            annualAmount: gratuityYearly,
            formula: 'Basic × 4.81%',
            calculationType: 'PERCENTAGE_OF_BASIC',
            percentage: 4.81
        });

        // Insurance (if applicable)
        if (components.insurance && components.insurance > 0) {
            const insuranceMonthly = Math.round(components.insurance * 100) / 100;
            const insuranceYearly = Math.round((insuranceMonthly * 12) * 100) / 100;
            benefits.push({
                name: 'Insurance',
                code: 'INSURANCE',
                monthlyAmount: insuranceMonthly,
                annualAmount: insuranceYearly,
                formula: `₹${insuranceMonthly} fixed`,
                calculationType: 'FLAT_AMOUNT'
            });
        }

        // ============================================
        // STEP 5: SPECIAL ALLOWANCE (AUTO-BALANCE - CRITICAL)
        // ============================================
        const earningsSum = earnings.reduce((sum, e) => sum + e.annualAmount, 0);
        const benefitsSum = benefits.reduce((sum, b) => sum + b.annualAmount, 0);

        const specialAllowanceYearly = annualCTC - earningsSum - benefitsSum;
        const specialAllowanceMonthly = Math.round((specialAllowanceYearly / 12) * 100) / 100;

        // CRITICAL VALIDATION: Special Allowance must never be negative
        if (specialAllowanceYearly < 0) {
            throw new Error(
                `CTC Breakdown Error: Special Allowance is negative (₹${specialAllowanceYearly.toFixed(2)}). ` +
                `CTC (₹${annualCTC}) is insufficient to cover Basic + HRA + Fixed Allowances + Benefits. ` +
                `Please increase CTC or reduce fixed components.`
            );
        }

        earnings.push({
            name: 'Special Allowance',
            code: 'SPECIAL_ALLOWANCE',
            monthlyAmount: Math.round(specialAllowanceMonthly * 100) / 100,
            annualAmount: Math.round(specialAllowanceYearly * 100) / 100,
            formula: 'CTC - (Earnings + Benefits)',
            calculationType: 'BALANCE',
            isBalancer: true
        });

        // ============================================
        // STEP 6: CALCULATE EMPLOYEE DEDUCTIONS
        // ============================================
        const employeeDeductions = [];

        // Employee PF (12% of Basic) - MANDATORY
        const employeePFPercentage = components.employeePFPercentage || 0.12;
        const employeePFMonthly = Math.round((basicMonthly * employeePFPercentage) * 100) / 100;
        const employeePFYearly = Math.round((employeePFMonthly * 12) * 100) / 100;
        employeeDeductions.push({
            name: 'Employee PF',
            code: 'EMPLOYEE_PF',
            monthlyAmount: employeePFMonthly,
            annualAmount: employeePFYearly,
            formula: 'Basic × 12%',
            calculationType: 'PERCENTAGE_OF_BASIC',
            percentage: 12
        });

        // Professional Tax (₹200/month) - MANDATORY
        const professionalTaxMonthly = components.professionalTax || 200;
        const professionalTaxYearly = Math.round((professionalTaxMonthly * 12) * 100) / 100;
        employeeDeductions.push({
            name: 'Professional Tax',
            code: 'PROFESSIONAL_TAX',
            monthlyAmount: professionalTaxMonthly,
            annualAmount: professionalTaxYearly,
            formula: '₹200 fixed',
            calculationType: 'FLAT_AMOUNT'
        });

        // ============================================
        // STEP 7: FINAL SALARY CALCULATION
        // ============================================
        const grossEarningsYearly = earnings.reduce((sum, e) => sum + e.annualAmount, 0);
        const grossEarningsMonthly = Math.round((grossEarningsYearly / 12) * 100) / 100;

        const totalDeductionsYearly = employeeDeductions.reduce((sum, d) => sum + d.annualAmount, 0);
        const totalDeductionsMonthly = Math.round((totalDeductionsYearly / 12) * 100) / 100;

        const totalBenefitsYearly = benefits.reduce((sum, b) => sum + b.annualAmount, 0);
        const totalBenefitsMonthly = Math.round((totalBenefitsYearly / 12) * 100) / 100;

        const netPayMonthly = Math.round((grossEarningsMonthly - totalDeductionsMonthly) * 100) / 100;
        const netPayYearly = Math.round((netPayMonthly * 12) * 100) / 100;

        // Final CTC (should match input)
        const calculatedCTCYearly = Math.round((grossEarningsYearly + totalBenefitsYearly) * 100) / 100;
        const calculatedCTCMonthly = Math.round((calculatedCTCYearly / 12) * 100) / 100;

        // ============================================
        // VALIDATION: CTC INTEGRITY CHECK
        // ============================================
        const ctcDifference = Math.abs(calculatedCTCYearly - annualCTC);
        if (ctcDifference > 1) { // Allow ₹1 tolerance for rounding
            console.warn(
                `⚠️ CTC Mismatch: Input CTC = ₹${annualCTC}, Calculated CTC = ₹${calculatedCTCYearly}, ` +
                `Difference = ₹${ctcDifference}`
            );
        }

        // ============================================
        // RETURN IMMUTABLE SALARY SNAPSHOT
        // ============================================
        return {
            // CTC
            annualCTC: annualCTC,
            monthlyCTC: monthlyCTC,
            calculatedCTC: calculatedCTCYearly,
            ctcDifference: ctcDifference,

            // Components
            earnings: earnings,
            employeeDeductions: employeeDeductions,
            benefits: benefits,

            // Totals
            grossEarnings: {
                monthly: grossEarningsMonthly,
                yearly: grossEarningsYearly
            },
            totalDeductions: {
                monthly: totalDeductionsMonthly,
                yearly: totalDeductionsYearly
            },
            totalBenefits: {
                monthly: totalBenefitsMonthly,
                yearly: totalBenefitsYearly
            },
            netPay: {
                monthly: netPayMonthly,
                yearly: netPayYearly
            },

            // Breakdown (for backward compatibility)
            breakdown: {
                basic: basicMonthly,
                hra: hraMonthly,
                grossA: grossEarningsMonthly,
                grossB: grossEarningsMonthly + totalBenefitsMonthly,
                grossC: calculatedCTCMonthly,
                takeHome: netPayMonthly
            },

            // Metadata
            calculatedAt: new Date(),
            locked: false // Will be locked when saved to DB
        };
    }

    /**
     * Validate salary snapshot integrity
     */
    static validateSnapshot(snapshot) {
        const errors = [];

        // Check for negative values
        if (snapshot.earnings.some(e => e.annualAmount < 0)) {
            errors.push('Earnings cannot be negative');
        }

        // Check Special Allowance
        const specialAllowance = snapshot.earnings.find(e => e.code === 'SPECIAL_ALLOWANCE');
        if (specialAllowance && specialAllowance.annualAmount < 0) {
            errors.push('Special Allowance is negative - CTC is too low');
        }

        // Check CTC match
        if (snapshot.ctcDifference > 1) {
            errors.push(`CTC mismatch: ₹${snapshot.ctcDifference} difference`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = PayrollCalculator;
