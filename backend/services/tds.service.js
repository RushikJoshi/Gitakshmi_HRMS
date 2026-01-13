/**
 * Basic TDS Service
 * Provides simplified monthly TDS calculation using configurable slabs.
 * Intended as an extensible starting point (supports old regime-like slabs).
 */

function calculateAnnualTax(annualTaxable) {
  let tax = 0;

  if (annualTaxable <= 250000) return { tax: 0, breakdown: [] };

  const breakdown = [];

  // 250000 - 500000 : 5%
  if (annualTaxable > 250000) {
    const from = 250000;
    const to = Math.min(annualTaxable, 500000);
    const slabTax = (to - from) * 0.05;
    tax += slabTax;
    breakdown.push({ from, to, rate: 0.05, amount: Math.round(slabTax) });
  }

  // 500000 - 1000000 : 20%
  if (annualTaxable > 500000) {
    const from = 500000;
    const to = Math.min(annualTaxable, 1000000);
    const slabTax = (to - from) * 0.20;
    tax += slabTax;
    breakdown.push({ from, to, rate: 0.20, amount: Math.round(slabTax) });
  }

  // 1000000+ : 30%
  if (annualTaxable > 1000000) {
    const from = 1000000;
    const to = annualTaxable;
    const slabTax = (to - from) * 0.30;
    tax += slabTax;
    breakdown.push({ from, to, rate: 0.30, amount: Math.round(slabTax) });
  }

  // Rebate u/s 87A (simple): For annual taxable <= 500000, tax becomes zero
  if (annualTaxable <= 500000) {
    tax = 0;
  }

  // Cess 4%
  const cess = Math.round((tax * 0.04) * 100) / 100;
  const total = Math.round((tax + cess) * 100) / 100;

  return { tax: Math.round(tax * 100) / 100, cess, total, breakdown };
}

async function calculateMonthlyTDS(monthlyTaxable, employee, opts = {}) {
  // monthlyTaxable: taxable income for the month after pre-tax deductions
  // employee: employee doc (may include metadata like age, regime in future)
  // opts: { month, year, tenantId }

  const annualTaxable = Math.round(monthlyTaxable * 12 * 100) / 100;

  const annualResult = calculateAnnualTax(annualTaxable);

  const monthly = Math.round((annualResult.total / 12) * 100) / 100;

  return {
    monthly,
    annual: annualTaxable,
    breakdown: annualResult.breakdown,
    incomeTaxBeforeCess: annualResult.tax,
    cess: annualResult.cess,
    annualTaxWithCess: annualResult.total
  };
}

module.exports = {
  calculateMonthlyTDS
};
