// Salary Engine: Resolves salary templates, evaluates formulas, outputs salary snapshot
const FormulaEngine = require('../formulaEngine');
const EmployeeSalarySnapshot = require('../../models/EmployeeSalarySnapshot');

class SalaryEngine {
  static async generateSnapshot({ employee, tenant, ctc, template, effectiveDate }) {
    // template: { earnings: [{code, formula}], deductions: [{code, formula}] }
    const formulas = {};
    template.earnings.forEach(e => { formulas[e.code] = e.formula; });
    template.deductions.forEach(d => { formulas[d.code] = d.formula; });
    formulas['CTC'] = ctc.toString();
    const context = { CTC: ctc };
    const engine = new FormulaEngine(formulas);
    // Evaluate all earnings
    const earnings = template.earnings.map(e => ({
      name: e.name,
      code: e.code,
      formula: e.formula,
      amount: engine.evaluate(e.code, context),
      resolved: true
    }));
    // Evaluate all deductions
    const deductions = template.deductions.map(d => ({
      name: d.name,
      code: d.code,
      formula: d.formula,
      amount: engine.evaluate(d.code, context),
      resolved: true
    }));
    // Σ earnings must equal CTC
    const earningsSum = earnings.reduce((sum, e) => sum + e.amount, 0);
    if (Math.abs(earningsSum - ctc) > 1) throw new Error('Σ earnings ≠ CTC');
    // Save snapshot
    const snapshot = await EmployeeSalarySnapshot.create({
      employee, tenant, ctc, earnings, deductions, effectiveDate
    });
    return snapshot;
  }
}

module.exports = SalaryEngine;