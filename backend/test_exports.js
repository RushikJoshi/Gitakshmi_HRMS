// Quick test to verify calculateSalaryStructure is exported
const salaryCalcService = require('./services/salaryCalculation.service');

console.log('Available exports:', Object.keys(salaryCalcService));
console.log('calculateSalaryStructure exists:', typeof salaryCalcService.calculateSalaryStructure);
console.log('calculateCompleteSalaryBreakdown exists:', typeof salaryCalcService.calculateCompleteSalaryBreakdown);

if (typeof salaryCalcService.calculateSalaryStructure === 'function') {
  console.log('✓ calculateSalaryStructure is correctly exported as a function');
} else {
  console.log('✗ calculateSalaryStructure is NOT a function. Type:', typeof salaryCalcService.calculateSalaryStructure);
}
