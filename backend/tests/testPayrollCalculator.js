/**
 * Test script for PayrollCalculator
 * Run with: node backend/tests/testPayrollCalculator.js
 */

const PayrollCalculator = require('../services/PayrollCalculator');

console.log('='.repeat(60));
console.log('PAYROLL CALCULATOR TEST');
console.log('='.repeat(60));

// Test Case 1: Standard CTC
console.log('\n📊 TEST CASE 1: Annual CTC = ₹6,00,000');
console.log('-'.repeat(60));

try {
    const result1 = PayrollCalculator.calculateSalaryBreakup({
        annualCTC: 600000
    });

    console.log('\n✅ Calculation Successful!');
    console.log('\n📈 CTC Breakdown:');
    console.log(`   Annual CTC: ₹${result1.annualCTC.toLocaleString('en-IN')}`);
    console.log(`   Monthly CTC: ₹${result1.monthlyCTC.toLocaleString('en-IN')}`);
    console.log(`   Calculated CTC: ₹${result1.calculatedCTC.toLocaleString('en-IN')}`);
    console.log(`   Difference: ₹${result1.ctcDifference.toFixed(2)}`);

    console.log('\n💰 Earnings (Monthly):');
    result1.earnings.forEach(e => {
        console.log(`   ${e.name.padEnd(25)} ₹${e.monthlyAmount.toLocaleString('en-IN').padStart(10)} (₹${e.annualAmount.toLocaleString('en-IN')}/year)`);
    });

    console.log('\n🏢 Employer Benefits (Monthly):');
    result1.benefits.forEach(b => {
        console.log(`   ${b.name.padEnd(25)} ₹${b.monthlyAmount.toLocaleString('en-IN').padStart(10)} (₹${b.annualAmount.toLocaleString('en-IN')}/year)`);
    });

    console.log('\n📉 Employee Deductions (Monthly):');
    result1.employeeDeductions.forEach(d => {
        console.log(`   ${d.name.padEnd(25)} ₹${d.monthlyAmount.toLocaleString('en-IN').padStart(10)} (₹${d.annualAmount.toLocaleString('en-IN')}/year)`);
    });

    console.log('\n💵 Final Totals:');
    console.log(`   Gross Earnings (Monthly): ₹${result1.grossEarnings.monthly.toLocaleString('en-IN')}`);
    console.log(`   Total Deductions (Monthly): ₹${result1.totalDeductions.monthly.toLocaleString('en-IN')}`);
    console.log(`   Net Take-Home (Monthly): ₹${result1.netPay.monthly.toLocaleString('en-IN')}`);

    // Validation
    const validation1 = PayrollCalculator.validateSnapshot(result1);
    console.log('\n🔍 Validation:');
    console.log(`   Status: ${validation1.valid ? '✅ PASS' : '❌ FAIL'}`);
    if (!validation1.valid) {
        console.log(`   Errors: ${validation1.errors.join(', ')}`);
    }

} catch (error) {
    console.error('\n❌ Error:', error.message);
}

// Test Case 2: Low CTC (should fail)
console.log('\n\n📊 TEST CASE 2: Annual CTC = ₹1,00,000 (Too Low)');
console.log('-'.repeat(60));

try {
    const result2 = PayrollCalculator.calculateSalaryBreakup({
        annualCTC: 100000
    });
    console.log('\n⚠️ This should have failed!');
} catch (error) {
    console.log('\n✅ Expected Error Caught:');
    console.log(`   ${error.message}`);
}

// Test Case 3: Invalid CTC
console.log('\n\n📊 TEST CASE 3: Invalid CTC (Negative)');
console.log('-'.repeat(60));

try {
    const result3 = PayrollCalculator.calculateSalaryBreakup({
        annualCTC: -50000
    });
    console.log('\n⚠️ This should have failed!');
} catch (error) {
    console.log('\n✅ Expected Error Caught:');
    console.log(`   ${error.message}`);
}

// Test Case 4: High CTC with custom components
console.log('\n\n📊 TEST CASE 4: Annual CTC = ₹12,00,000 with Custom Components');
console.log('-'.repeat(60));

try {
    const result4 = PayrollCalculator.calculateSalaryBreakup({
        annualCTC: 1200000,
        components: {
            medical: 2000,
            conveyance: 2500,
            mobile: 1000,
            insurance: 500
        }
    });

    console.log('\n✅ Calculation Successful!');
    console.log(`   Annual CTC: ₹${result4.annualCTC.toLocaleString('en-IN')}`);
    console.log(`   Monthly CTC: ₹${result4.monthlyCTC.toLocaleString('en-IN')}`);
    console.log(`   Net Take-Home (Monthly): ₹${result4.netPay.monthly.toLocaleString('en-IN')}`);

    const specialAllowance = result4.earnings.find(e => e.code === 'SPECIAL_ALLOWANCE');
    console.log(`   Special Allowance (Monthly): ₹${specialAllowance.monthlyAmount.toLocaleString('en-IN')}`);

} catch (error) {
    console.error('\n❌ Error:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60) + '\n');
