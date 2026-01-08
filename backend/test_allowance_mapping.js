const mongoose = require('mongoose');
require('dotenv').config();

async function testAllowanceMapping() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔍 Testing Allowance Mapping (Education, Transport, Mobile, Compensatory)\n');

        const db = mongoose.connection.useDb('company_695c98181a01d447895992ff');

        const Applicant = db.model('Applicant', require('./models/Applicant'));
        const SalaryStructure = db.model('SalaryStructure', require('./models/SalaryStructure'));

        const applicant = await Applicant.findOne({ name: /mayur/i }).lean();
        const structure = await SalaryStructure.findOne({ candidateId: applicant._id }).lean();

        // Import the utility
        const { mapOfferToJoiningData } = require('./utils/joiningLetterUtils');

        // Map the data
        const mappedData = mapOfferToJoiningData(applicant, {}, structure);

        console.log('📋 MAPPED DATA FOR JOINING LETTER:\n');

        const checkField = (label, monthlyKey, yearlyKey, searchPattern) => {
            console.log(`${label}:`);
            console.log(`  Monthly (${monthlyKey}): ${mappedData[monthlyKey]}`);
            console.log(`  Yearly (${yearlyKey}): ${mappedData[yearlyKey]}`);

            // Find expected value
            const comp = structure.earnings.find(e =>
                e.label.toLowerCase().includes(searchPattern)
            );
            const expected = comp?.monthly || 0;
            const actual = Number(mappedData[monthlyKey].replace(/,/g, '').replace(/-/g, '0'));

            console.log(`  Expected: ${expected}`);
            console.log(`  Match: ${expected === actual ? '✅' : '❌'}`);
            console.log('');
        };

        checkField('Education Allowance', 'education_monthly', 'education_yearly', 'education');
        checkField('Transport Allowance', 'transport_monthly', 'transport_yearly', 'conveyance');
        checkField('Mobile Reimbursement', 'mobile_reimbursement_monthly', 'mobile_reimbursement_yearly', 'mobile');

        // Compensatory isn't in Mayur's salary, but we can check if the field exists (should be '-')
        console.log('Compensatory Allowance (Not in salary):');
        console.log(`  Monthly: ${mappedData.compensatory_allowance_monthly}`);
        console.log(`  Match: ${mappedData.compensatory_allowance_monthly === '-' ? '✅' : '❌'}`);

        console.log('\n🎉 Test Complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAllowanceMapping();
