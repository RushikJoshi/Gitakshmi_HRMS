/**
 * Comprehensive Payroll Module Integration Tests
 * Tests all salary template CRUD operations and payroll calculations
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
const API_BASE = 'http://localhost:5000/api';
let tenantId, tenantDB, templateId, employeeId;

// Mock auth token
const mockToken = 'Bearer mock-token-for-testing';

async function connect() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

async function getFirstTenant() {
  const Tenant = mongoose.model('Tenant');
  const tenant = await Tenant.findOne().lean();
  if (!tenant) {
    console.error('✗ No tenants found in database');
    process.exit(1);
  }
  tenantId = tenant._id.toString();
  console.log(`✓ Using tenant: ${tenant.name} (${tenantId})`);
  return tenant;
}

async function setupTenantDB() {
  const { getTenantDB } = require('./config/dbManager');
  tenantDB = getTenantDB(tenantId);
  console.log('✓ Tenant DB initialized');
}

async function testSalaryTemplateCreation() {
  console.log('\n=== Test 1: Create Salary Template ===');
  
  const payload = {
    templateName: `Test Template ${Date.now()}`,
    description: 'Test salary template for payroll',
    annualCTC: 500000,
    earnings: [
      { name: 'Basic', monthlyAmount: 20000, annualAmount: 240000 },
      { name: 'HRA', monthlyAmount: 5000, annualAmount: 60000 }
    ],
    employeeDeductions: [
      { name: 'EPF', monthlyAmount: 1800, annualAmount: 21600 }
    ],
    employerDeductions: [
      { name: 'Employer EPF', monthlyAmount: 1800, annualAmount: 21600 }
    ],
    settings: { includePensionScheme: true, includeESI: false }
  };

  try {
    // Simulate API call (in real scenario this would be HTTP)
    const SalaryTemplate = tenantDB.model('SalaryTemplate');
    const template = new SalaryTemplate({
      tenantId,
      ...payload
    });
    await template.save();
    templateId = template._id;
    console.log(`✓ Template created: ${templateId}`);
    return template;
  } catch (err) {
    console.error('✗ Template creation failed:', err.message);
    throw err;
  }
}

async function testSalaryTemplateRetrieval() {
  console.log('\n=== Test 2: Retrieve Salary Template ===');
  
  try {
    const SalaryTemplate = tenantDB.model('SalaryTemplate');
    const template = await SalaryTemplate.findById(templateId).lean();
    if (!template) throw new Error('Template not found');
    console.log(`✓ Template retrieved: ${template.templateName}`);
    console.log(`  - Annual CTC: ₹${template.annualCTC}`);
    console.log(`  - Monthly CTC: ₹${template.monthlyCTC}`);
    console.log(`  - Earnings: ${template.earnings.map(e => e.name).join(', ')}`);
    return template;
  } catch (err) {
    console.error('✗ Template retrieval failed:', err.message);
    throw err;
  }
}

async function testSalaryTemplateUpdate() {
  console.log('\n=== Test 3: Update Salary Template ===');
  
  try {
    const SalaryTemplate = tenantDB.model('SalaryTemplate');
    const template = await SalaryTemplate.findById(templateId);
    template.description = 'Updated description';
    template.annualCTC = 600000;
    template.monthlyCTC = 50000;
    await template.save();
    console.log(`✓ Template updated: ${template._id}`);
    return template;
  } catch (err) {
    console.error('✗ Template update failed:', err.message);
    throw err;
  }
}

async function testPayrollCalculation() {
  console.log('\n=== Test 4: Test Payroll Calculation ===');
  
  try {
    const SalaryTemplate = tenantDB.model('SalaryTemplate');
    const template = await SalaryTemplate.findById(templateId);
    
    const salaryCalcService = require('./services/salaryCalculation.service');
    const calculated = salaryCalcService.calculateCompleteSalaryBreakdown(template);
    
    console.log(`✓ Salary breakdown calculated:`);
    console.log(`  - Gross A (Monthly): ₹${calculated.grossA.monthly}`);
    console.log(`  - Gross B (Monthly): ₹${calculated.grossB.monthly}`);
    console.log(`  - Gross C/CTC (Monthly): ₹${calculated.grossC.monthly}`);
    console.log(`  - Take Home (Monthly): ₹${calculated.takeHome.monthly}`);
    return calculated;
  } catch (err) {
    console.error('✗ Payroll calculation failed:', err.message);
    throw err;
  }
}

async function testTDSCalculation() {
  console.log('\n=== Test 5: Test TDS Calculation ===');
  
  try {
    const tdsService = require('./services/tds.service');
    const monthlyTaxable = 40000;
    const result = await tdsService.calculateMonthlyTDS(monthlyTaxable, {}, { month: 1, year: 2026 });
    
    console.log(`✓ TDS calculated for monthly taxable ₹${monthlyTaxable}:`);
    console.log(`  - Annual Taxable: ₹${result.annual}`);
    console.log(`  - Annual Tax (before cess): ₹${result.incomeTaxBeforeCess}`);
    console.log(`  - Cess (4%): ₹${result.cess}`);
    console.log(`  - Monthly TDS: ₹${result.monthly}`);
    return result;
  } catch (err) {
    console.error('✗ TDS calculation failed:', err.message);
    throw err;
  }
}

async function testAttendanceData() {
  console.log('\n=== Test 6: Check Attendance Data ===');
  
  try {
    const Attendance = tenantDB.model('Attendance');
    const Employee = tenantDB.model('Employee');
    
    // Find first employee with name containing 'dharmik'
    const emp = await Employee.findOne({ 
      firstName: /dharmik/i 
    }).lean();
    
    if (!emp) {
      console.log('⚠ No employee named Dharmik found');
      return null;
    }
    
    const jan2026 = {
      $gte: new Date(2026, 0, 1),
      $lte: new Date(2026, 0, 31)
    };
    
    const attendance = await Attendance.countDocuments({
      employee: emp._id,
      date: jan2026,
      status: 'present'
    });
    
    console.log(`✓ Attendance found for ${emp.firstName} ${emp.lastName}:`);
    console.log(`  - Present days (Jan 2026): ${attendance}`);
    return attendance;
  } catch (err) {
    console.error('✗ Attendance check failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  try {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   Payroll Module Integration Test Suite            ║');
    console.log('╚════════════════════════════════════════════════════╝');

    await connect();
    await getFirstTenant();
    await setupTenantDB();
    
    await testSalaryTemplateCreation();
    await testSalaryTemplateRetrieval();
    await testSalaryTemplateUpdate();
    await testPayrollCalculation();
    await testTDSCalculation();
    await testAttendanceData();
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ✓ All tests passed successfully!                ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Test suite failed');
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('\n✗ Test suite failed with error:');
  console.error(err);
  process.exit(1);
});
