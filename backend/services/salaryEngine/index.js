// Salary Engine: Resolves salary templates, evaluates formulas, outputs salary snapshot
const FormulaEngine = require('../formulaEngine');

class SalaryEngine {
  /**
   * Generates an immutable salary snapshot for an employee or applicant/candidate.
   * 
   * @param {Object} params
   * @param {Object} params.tenantDB - Tenant database connection
   * @param {ObjectId} params.employeeId - Employee ID (optional if applicantId provided)
   * @param {ObjectId} params.applicantId - Applicant ID (optional if employeeId provided)
   * @param {ObjectId} params.tenantId - Tenant ID
   * @param {Number} params.annualCTC - Annual CTC
   * @param {Object} params.template - Salary Template document with components and formulas
   * @param {Date} params.effectiveDate - When this salary becomes effective
   */
  /**
   * Resolves salary components without saving to database.
   * Completely Refactored for CTC Integrity (Special Allowance Auto-Balancing)
   */
  static async calculate({ annualCTC, template, additionalComponents = [] }) {
    if (!annualCTC || isNaN(annualCTC) || annualCTC <= 0) throw new Error('Positive annualCTC is required');
    if (!template) throw new Error('Salary template is required');

    // Prepare formulas and metadata
    const formulas = {};
    const componentMeta = {};
    const M2A = 12;

    // 0. Merge Additional Components (Ad-hoc)
    // additionalComponents is now directly destructured from params

    if (additionalComponents && Array.isArray(additionalComponents)) {
      additionalComponents.forEach(comp => {
        const mapped = {
          code: comp.code || comp.componentCode || comp.name.toUpperCase().replace(/\s+/g, '_'),
          name: comp.name,
          formula: comp.formula || comp.value?.toString() || '0'
        };

        if (comp.category === 'Earnings' || comp.type === 'Earning') {
          if (!template.earnings) template.earnings = [];
          template.earnings.push(mapped);
        } else if (comp.category === 'Deductions' || comp.type === 'Deduction') {
          if (!template.employeeDeductions) template.employeeDeductions = [];
          template.employeeDeductions.push(mapped);
        } else if (comp.category === 'Benefits' || comp.type === 'Benefit') {
          if (!template.employerDeductions) template.employerDeductions = [];
          template.employerDeductions.push(mapped);
        }
      });
    }

    // --- PHASE 1: COMPONENT REGISTRATION ---

    // 1. Register Earnings (Excluding SPECIAL_ALLOWANCE first)
    if (template.earnings) {
      template.earnings.forEach(e => {
        const code = e.code || e.componentCode || e.name.toUpperCase().replace(/\s+/g, '_');
        if (code === 'SPECIAL_ALLOWANCE') return; // Skip for now, will handle last
        formulas[code] = e.formula || (e.annualAmount || (e.monthlyAmount * M2A)).toString();
        componentMeta[code] = { name: e.name, type: 'EARNING' };
      });
    }

    // 2. Register Employer Benefits
    if (template.employerDeductions) {
      template.employerDeductions.forEach(d => {
        const code = d.code || d.componentCode || d.name.toUpperCase().replace(/\s+/g, '_');
        formulas[code] = d.formula || (d.annualAmount || (d.monthlyAmount * M2A)).toString();
        componentMeta[code] = { name: d.name, type: 'BENEFIT' };
      });
    }

    // 3. Register Employee Deductions
    if (template.employeeDeductions) {
      template.employeeDeductions.forEach(d => {
        const code = d.code || d.componentCode || d.name.toUpperCase().replace(/\s+/g, '_');
        formulas[code] = d.formula || (d.annualAmount || (d.monthlyAmount * M2A)).toString();
        componentMeta[code] = { name: d.name, type: 'DEDUCTION' };
      });
    }

    // Context for evaluation
    const context = { CTC: annualCTC };
    formulas['CTC'] = annualCTC.toString();

    // 4. Resolve via FormulaEngine (Phase 1)
    const engine = new FormulaEngine(formulas);
    let totalComputedEarnings = 0;
    let totalComputedBenefits = 0;

    const earnings = [];
    const deductions = [];
    const benefits = [];

    // Helper to process items
    const processItem = (code, meta) => {
      try {
        let amount = engine.evaluate(code, context);
        // Ensure non-negative
        amount = Math.max(0, amount);

        const item = {
          name: meta.name,
          code: code,
          annualAmount: Math.round(amount * 100) / 100,
          monthlyAmount: Math.round((amount / 12) * 100) / 100,
          formula: formulas[code],
          resolved: true
        };

        if (meta.type === 'EARNING') {
          earnings.push(item);
          totalComputedEarnings += item.annualAmount;
        } else if (meta.type === 'BENEFIT') {
          benefits.push(item);
          totalComputedBenefits += item.annualAmount;
        } else if (meta.type === 'DEDUCTION') {
          deductions.push(item);
        }
      } catch (err) {
        throw new Error(`Formula resolution failed for ${code}: ${err.message}`);
      }
    };

    // Calculate everything EXCEPT Special Allowance
    for (const code in componentMeta) {
      processItem(code, componentMeta[code]);
    }

    // --- PHASE 2: SPECIAL ALLOWANCE (The Balancer) ---
    // Formula: Special Allowance = CTC - (Sum(Earnings) + Sum(Benefits))
    // Note: Deductions come FROM Earnings, so they don't reduce the CTC cost directly (CTC = Gross Earnings + Benefits)

    let currentCost = totalComputedEarnings + totalComputedBenefits;
    let balance = annualCTC - currentCost;

    // Handle floating point precision
    balance = Math.round(balance * 100) / 100;

    const specialAllowanceCode = 'SPECIAL_ALLOWANCE';
    const specialAllowanceName = 'Special Allowance';

    if (balance < 0) {
      // If negative, it means fixed components > CTC. This is a configuration error, but we shouldn't crash?
      // Actually, we must warn or set to 0 and throw error?
      // Indian Payroll: Basic is usually fixed % of CTC. If formulas are correct, balance should be positive.
      // If negative, we force Special Allowance to 0 and let it fail validation or return with warning?
      // We'll add it as 0
      const saItem = {
        name: specialAllowanceName,
        code: specialAllowanceCode,
        annualAmount: 0,
        monthlyAmount: 0,
        formula: "CTC - (Earnings + Benefits)",
        resolved: true,
        isBalancer: true
      };
      earnings.push(saItem);
    } else {
      // Positive Balance -> Assign to Special Allowance
      const saItem = {
        name: specialAllowanceName,
        code: specialAllowanceCode, // Standard Code
        annualAmount: balance,
        monthlyAmount: Math.round((balance / 12) * 100) / 100,
        formula: "CTC - (Earnings + Benefits)",
        resolved: true,
        isBalancer: true
      };
      earnings.push(saItem);
      totalComputedEarnings += balance; // Add to totals
      currentCost += balance;
    }

    // --- PHASE 3: FINAL TOTALS ---

    // Sort Earnings: Basic First, Special Allowance Last
    earnings.sort((a, b) => {
      if (a.code === 'BASIC') return -1;
      if (b.code === 'BASIC') return 1;
      if (a.code === 'SPECIAL_ALLOWANCE') return 1;
      if (b.code === 'SPECIAL_ALLOWANCE') return -1;
      return 0;
    });

    const earningsSum = earnings.reduce((sum, e) => sum + e.annualAmount, 0);
    const benefitsSum = benefits.reduce((sum, b) => sum + b.annualAmount, 0);
    const deductionsSum = deductions.reduce((sum, d) => sum + d.annualAmount, 0);

    // Final Cost
    const finalTotalCost = Math.round((earningsSum + benefitsSum) * 100) / 100;

    // Monthly breakdown
    const grossMonthly = Math.round((earningsSum / 12) * 100) / 100;
    const deductionsMonthly = Math.round((deductionsSum / 12) * 100) / 100;
    const benefitsMonthly = Math.round((benefitsSum / 12) * 100) / 100;
    const netMonthly = Math.round((grossMonthly - deductionsMonthly) * 100) / 100;

    return {
      annualCTC,
      monthlyCTC: Math.round((annualCTC / 12) * 100) / 100,
      earnings,
      deductions,
      benefits,
      totalCost: finalTotalCost,
      totals: {
        grossMonthly,
        deductionsMonthly,
        netMonthly,
        benefitsMonthly,
        ctcYearly: finalTotalCost, // Should match inputs
        // Legacy
        annualCTC: finalTotalCost,
        annualEarnings: earningsSum,
        annualDeductions: deductionsSum,
        annualBenefits: benefitsSum
      },
      difference: Math.abs(finalTotalCost - annualCTC)
    };
  }

  /**
   * Calculates and saves the snapshot
   */
  static async generateSnapshot(params) {
    const { tenantDB, employeeId, applicantId, tenantId, annualCTC, template, additionalComponents, effectiveDate } = params;
    if (!tenantDB) throw new Error('tenantDB is required');
    if (!employeeId && !applicantId) throw new Error('employeeId or applicantId is required');

    const calculated = await this.calculate({ annualCTC, template, additionalComponents: additionalComponents || [] });

    const EmployeeSalarySnapshot = tenantDB.model('EmployeeSalarySnapshot');

    // Persistence
    const snapshot = await EmployeeSalarySnapshot.create({
      employee: employeeId || null,
      applicant: applicantId || null,
      tenant: tenantId,
      ctc: annualCTC,
      earnings: calculated.earnings,
      deductions: calculated.deductions,
      benefits: calculated.benefits,
      effectiveDate: effectiveDate || new Date()
    });

    return snapshot;
  }
}

module.exports = SalaryEngine;