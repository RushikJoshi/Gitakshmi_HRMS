// Simplified Salary Aggregator (Strict Addition)
// NO AUTO-MAGIC - NO BALANCING - NO HIDDEN CALCULATIONS

const round2 = (v) => Math.round(Number(v) || 0);

/**
 * Validates and aggregates salary components
 * 
 * @param {Object} params
 * @param {Number} params.enteredCTC - Target annual CTC (Source of Truth)
 * @param {Array} params.earnings - Array of { name, amount, isSelected }
 * @param {Array} params.deductions - Array of { name, amount, isSelected }
 * @param {Array} params.employerContributions - Array of { name, amount, isSelected }
 * 
 * @returns {Object} Calculated totals and validation status
 */
function calculateSalaryBreakup({ enteredCTC, earnings = [], deductions = [], employerContributions = [] }) {
    // 1. Filter only selected components
    const activeEarnings = earnings.filter(e => e.isSelected);
    const activeDeductions = deductions.filter(d => d.isSelected);
    const activeBenefits = employerContributions.filter(b => b.isSelected);

    // 2. Sum Gross Earnings (Monthly)
    const grossEarningsMonthly = round2(activeEarnings.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));

    // 3. Sum Employee Deductions (Monthly)
    const totalDeductionsMonthly = round2(activeDeductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));

    // 4. Sum Employer Contributions (Monthly)
    const totalEmployerContributionsMonthly = round2(activeBenefits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0));

    // 5. Calculate Actual CTC
    // Annual CTC = (Gross Monthly + Employer Monthly) * 12
    const calculatedAnnualCTC = round2((grossEarningsMonthly + totalEmployerContributionsMonthly) * 12);

    // 6. Calculate Net Salary (Take Home)
    const netSalaryMonthly = round2(grossEarningsMonthly - totalDeductionsMonthly);

    // 7. Check for Mismatch (Allowed drift up to ₹12/year for integer rounding)
    const isMismatch = Math.abs(calculatedAnnualCTC - Number(enteredCTC)) > 12;

    return {
        success: true,
        monthly: {
            grossEarnings: grossEarningsMonthly,
            totalDeductions: totalDeductionsMonthly,
            netSalary: netSalaryMonthly,
            employerContributions: totalEmployerContributionsMonthly
        },
        annual: {
            ctc: calculatedAnnualCTC
        },
        isValid: !isMismatch,
        mismatchAmount: round2(calculatedAnnualCTC - Number(enteredCTC)),
        expectedCTC: Number(enteredCTC),
        receivedCTC: calculatedAnnualCTC,
        // Detailed lists for persistence
        earnings: activeEarnings,
        deductions: activeDeductions,
        employerContributions: activeBenefits
    };
}

/**
 * Generates a suggested salary breakup based on standard industry rules.
 * This is a helper, not a mandatory structure.
 */
function suggestSalaryBreakup({ enteredCTC, availableEarnings = [], availableDeductions = [], availableEmployerContributions = [] }) {
    const annualCTC = Number(enteredCTC) || 0;
    const monthlyCTC = round2(annualCTC / 12);

    let suggestedEarnings = [];
    let suggestedDeductions = [];
    let suggestedBenefits = [];

    // 1. Basic (50% of CTC usually, but let's take 50% of Monthly CTC)
    const basicAmount = round2(monthlyCTC * 0.5);

    // 2. HRA (40% of Basic as standard)
    const hraAmount = round2(basicAmount * 0.4);

    // 3. PF Calculations (Standard capped at 1800 or 12% of Basic)
    const pfBase = Math.min(basicAmount, 15000); // Standard PF ceiling
    const pfAmount = pfBase >= 15000 ? 1800 : round2(pfBase * 0.12);

    // 4. ESIC (Employer 3.25%, Employee 0.75% of Gross if Gross <= 21000)
    // For simplicity in suggestion, we skip ESIC unless user manually adds it

    // 5. Construct Suggested Arrays
    let consumedMonthly = 0;

    const addEarning = (name, amt, patterns) => {
        const comp = availableEarnings.find(e => {
            const dbName = (e.name || '').toLowerCase();
            const pName = (e.payslipName || '').toLowerCase();
            return patterns.some(p => dbName.includes(p) || pName.includes(p));
        });

        if (comp) {
            console.log(`[SUGGEST_SERVICE] Match found for ${name}: ${comp.name} (Amount: ${amt})`);
            suggestedEarnings.push({ componentId: comp._id, name: comp.name, amount: amt, isSelected: true, type: 'earning' });
            consumedMonthly += amt;
            return true;
        }
        console.warn(`[SUGGEST_SERVICE] NO MATCH found for expected component: ${name} (Patterns: ${patterns})`);
        return false;
    };

    const addBenefit = (name, amt, patterns) => {
        const comp = availableEmployerContributions.find(b => {
            const dbName = (b.name || '').toLowerCase();
            const pName = (b.payslipName || '').toLowerCase();
            return patterns.some(p => dbName.includes(p) || pName.includes(p));
        });
        if (comp) {
            suggestedBenefits.push({ componentId: comp._id, name: comp.name, amount: amt, isSelected: true, type: 'employer_contribution' });
            consumedMonthly += amt;
            return true;
        }
        return false;
    };

    const addDeduction = (name, amt, patterns) => {
        const comp = availableDeductions.find(d => {
            const dbName = (d.name || '').toLowerCase();
            const pName = (d.payslipName || '').toLowerCase();
            return patterns.some(p => dbName.includes(p) || pName.includes(p));
        });
        if (comp) {
            suggestedDeductions.push({ componentId: comp._id, name: comp.name, amount: amt, isSelected: true, type: 'deduction' });
            return true;
        }
        return false;
    };

    addEarning('Basic', basicAmount, ['basic', 'pay', 'fixed pay']);
    addEarning('HRA', hraAmount, ['hra', 'house rent', 'accommodation']);

    // Add standard fixed allowances if available
    addEarning('Medical Reimbursement', 1250, ['medical']);
    addEarning('Conveyance Allowance', 1600, ['conveyance', 'travel', 'transport']);
    addEarning('Education Allowance', 100, ['education', 'child']);
    addEarning('Book & Periodicals', 1000, ['book', 'periodical', 'journal', 'news']);
    addEarning('Uniform Allowance', 500, ['uniform', 'attire']);
    addEarning('Mobile Reimbursement', 500, ['mobile', 'phone', 'telephone', 'data']);

    // Statutory and Benefits - Add even if amount is 0 as they are often standard selections
    addBenefit('Employer PF', pfAmount, ['pf', 'provident', 'employer', 'epf']);
    addBenefit('Gratuity', 1000, ['gratuity', 'retiral']);
    addBenefit('Medical Insurance', 500, ['insurance', 'mediclaim', 'health', 'medical']);

    addDeduction('Employee PF', pfAmount, ['pf', 'provident', 'employee', 'epf']);
    addDeduction('Professional Tax', 200, ['pt', 'professional tax', 'tax on employment']);

    // 6. Balance the rest into Special Allowance
    const finalRemainder = Math.max(0, round2(monthlyCTC - consumedMonthly));

    // Check if we already matched a "Special Allowance" type component earlier in the list
    const existingSpecial = suggestedEarnings.find(e =>
        ['special', 'allowance', 'other', 'balance', 'flexible', 'additional'].some(p => e.name.toLowerCase().includes(p))
    );

    if (existingSpecial) {
        existingSpecial.amount = finalRemainder;
    } else {
        addEarning('Special Allowance', finalRemainder, ['special', 'allowance', 'other', 'balance', 'flexible', 'additional', 'adhoc']);
    }

    console.log(`[SUGGEST_SERVICE] Final suggested earnings count: ${suggestedEarnings.length}`);
    return {
        earnings: suggestedEarnings,
        deductions: suggestedDeductions,
        employerContributions: suggestedBenefits
    };
}

module.exports = {
    calculateSalaryBreakup,
    suggestSalaryBreakup
};
