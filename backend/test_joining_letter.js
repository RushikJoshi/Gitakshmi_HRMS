const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function testJoiningLetterTemplate() {
    try {
        console.log('🔥 Testing Joining Letter Template Rendering...\n');

        // Connect to main DB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to Main DB');

        // Get tenant
        const Tenant = require('./models/Tenant');
        const tenant = await Tenant.findOne({}); // Get first tenant
        if (!tenant) {
            console.error('❌ No tenant found');
            return;
        }
        console.log(`📍 Using tenant: ${tenant.name} (${tenant._id})`);

        // Get tenant DB
        const getTenantDB = require('./utils/tenantDB');
        const db = await getTenantDB(tenant._id);

        // Define Applicant schema and model
        const ApplicantSchema = require('./models/Applicant');
        const Applicant = db.model('Applicant', ApplicantSchema);

        // LetterTemplate is global (not tenant-scoped)
        const LetterTemplate = require('./models/LetterTemplate');

        // Find an applicant
        let applicant = await Applicant.findOne({});
        if (!applicant) {
            console.log('❌ No applicant found, creating a test applicant...');
            applicant = new Applicant({
                name: 'John Doe',
                email: 'john.doe@test.com',
                phone: '1234567890',
                position: 'Software Engineer',
                department: 'IT',
                location: 'Mumbai',
                joiningDate: new Date('2024-01-15'),
                tenant: tenant._id,
                status: 'selected'
            });
            await applicant.save();
            console.log('✅ Test applicant created');
        }
        console.log(`👤 Using applicant: ${applicant.name} (${applicant._id})`);

        // Find a joining template
        let template = await LetterTemplate.findOne({ type: 'joining', tenantId: tenant._id });
        if (!template) {
            console.log('❌ No joining template found, creating a test template...');
            // Create a simple test template
            const testTemplatePath = path.join(__dirname, 'test_template.docx');
            // For now, skip template creation and just test the logic
            console.log('❌ Skipping template creation - need actual Word template file');
            return;
        }
        console.log(`📄 Using template: ${template.name} (${template._id})`);
        console.log(`📄 Template file: ${template.filePath}`);
        console.log(`📄 Template placeholders:`, template.placeholders);

        // Check if template file exists
        try {
            await fs.access(template.filePath);
            console.log('✅ Template file exists');
        } catch (error) {
            console.error('❌ Template file does not exist:', template.filePath);
            return;
        }

        // Load template
        const content = await fs.readFile(template.filePath);
        console.log('✅ Template loaded');

        // Initialize Docxtemplater
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        console.log('✅ Docxtemplater initialized');

        // Simulate payload data (MATCHING USER ERROR LOG)
        const customData = {
            EMPLOYEE_NAME: 'jenu',
            DESIGNATION: 'SM',
            JOINING_DATE: '2025-12-23',
            ADDRESS: '', // Empty address - should NOT fall back to 'Employee Address' if not present in Applicant (or should stay empty)
            BASIC_SALARY: '10000',
            HRA: '100',
            CONVEYANCE: '100',
            LTA: '100',
            MEDICAL: '100',
            OTHER_ALLOWANCES: '100',
            TOTAL_EARNINGS: '10500.00',
            PF_EMPLOYEE: '50',
            PF_EMPLOYER: '50',
            GRATUITY: '50',
            TOTAL_DEDUCTIONS: '150.00',
            TAKE_HOME: '10350.00',
            CTC: '124200.00'
        };

        // Map data using joiningLetterUtils
        const joiningLetterUtils = require('./utils/joiningLetterUtils');
        const data = joiningLetterUtils.mapOfferToJoiningData(applicant, customData);

        // Add salary mappings with safe fallbacks
        const safeParseFloat = (value) => {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        };

        const safeMonthly = (annualValue) => {
            const annual = safeParseFloat(annualValue);
            return annual > 0 ? (annual / 12).toFixed(2) : '0.00';
        };

        Object.assign(data, {
            // Monthly salary components
            basic_monthly: safeMonthly(customData.BASIC_SALARY),
            hra_monthly: safeMonthly(customData.HRA),
            conveyance_monthly: safeMonthly(customData.CONVEYANCE),
            lta_monthly: safeMonthly(customData.LTA),
            medical_monthly: safeMonthly(customData.MEDICAL),
            other_allowances_monthly: safeMonthly(customData.OTHER_ALLOWANCES),
            total_earnings_monthly: safeMonthly(customData.TOTAL_EARNINGS),
            pf_employee_monthly: safeMonthly(customData.PF_EMPLOYEE),
            total_deductions_monthly: safeMonthly(customData.TOTAL_DEDUCTIONS),
            take_home_monthly: customData.TAKE_HOME || '0.00',
            ctc_monthly: safeMonthly(customData.CTC),

            // Annual salary components
            basic_annual: customData.BASIC_SALARY || '0.00',
            hra_annual: customData.HRA || '0.00',
            conveyance_annual: customData.CONVEYANCE || '0.00',
            lta_annual: customData.LTA || '0.00',
            medical_annual: customData.MEDICAL || '0.00',
            other_allowances_annual: customData.OTHER_ALLOWANCES || '0.00',
            total_earnings_annual: customData.TOTAL_EARNINGS || '0.00',
            pf_employee_annual: customData.PF_EMPLOYEE || '0.00',
            pf_employer_annual: customData.PF_EMPLOYER || '0.00',
            gratuity_annual: customData.GRATUITY || '0.00',
            total_deductions_annual: customData.TOTAL_DEDUCTIONS || '0.00',
            take_home_annual: safeAnnual(customData.TAKE_HOME),
            ctc_annual: customData.CTC || '0.00',

            // Additional common variables
            employee_name: data.EMPLOYEE_NAME || 'Employee Name',
            employee_title: data.EMPLOYEE_TITLE || 'Mr./Ms.',
            designation: data.DESIGNATION || 'Designation',
            department: data.DEPARTMENT || 'Department',
            joining_date: data.JOINING_DATE || 'Joining Date',
            address: data.ADDRESS || 'Employee Address',
            offer_ref_no: data.OFFER_REF_NO || 'Reference Number',
            offer_date: data.OFFER_DATE || 'Offer Date',
            location: data.LOCATION || 'Work Location',
            current_date: data.CURRENT_DATE || new Date().toLocaleDateString('en-IN'),
            employee_signature: data.EMPLOYEE_SIGNATURE || '',
            authorized_signatory: data.AUTHORIZED_SIGNATORY || 'HR Manager'
        });

        console.log('\n📊 Final data mapping:');
        console.log('Available variables:', Object.keys(data).sort());
        console.log('\nSample values:');
        Object.entries(data).slice(0, 20).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });

        // Try to render
        try {
            doc.render(data);
            console.log('\n✅ Template rendered successfully!');

            // Generate buffer to verify
            const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
            console.log('✅ Generated output buffer successfully');

        } catch (renderError) {
            console.error('\n❌ Template rendering failed:', renderError.message);
            console.error('Error properties:', renderError.properties);

            if (renderError.properties && renderError.properties.errors) {
                console.error('\nMissing variables:');
                renderError.properties.errors.forEach(err => {
                    console.error(`  - ${err}`);
                });
            }

            console.log('\n🔍 Troubleshooting:');
            console.log('Available variables in data:', Object.keys(data));
            console.log('Template placeholders:', template.placeholders || []);

            return;
        }

        console.log('\n🎉 Joining Letter template test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

// Helper function for annual calculation
function safeAnnual(monthlyValue) {
    const monthly = parseFloat(monthlyValue);
    return monthly > 0 ? (monthly * 12).toFixed(2) : '0.00';
}

testJoiningLetterTemplate();