const mongoose = require('mongoose');
require('dotenv').config();

async function testEducationTransport() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔍 Testing Education & Transport Allowance Mapping\n');

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
        console.log('Education Allowance:');
        console.log(`  Monthly: ${mappedData.education_monthly}`);
        console.log(`  Yearly: ${mappedData.education_yearly}`);
        console.log('');
        console.log('Transport Allowance:');
        console.log(`  Monthly: ${mappedData.transport_monthly}`);
        console.log(`  Yearly: ${mappedData.transport_yearly}`);
        console.log('');
        console.log('Conveyance Allowance (alias):');
        console.log(`  Monthly: ${mappedData.conveyance_monthly}`);
        console.log(`  Yearly: ${mappedData.conveyance_yearly}`);

        console.log('\n✅ VERIFICATION:');

        // Find the actual values from structure
        const educationComp = structure.earnings.find(e =>
            e.label.toLowerCase().includes('education')
        );
        const conveyanceComp = structure.earnings.find(e =>
            e.label.toLowerCase().includes('conveyance')
        );

        console.log(`\nExpected Education: ₹${educationComp?.monthly || 0}`);
        console.log(`Mapped Education: ${mappedData.education_monthly}`);
        console.log(`Match: ${mappedData.education_monthly === (educationComp?.monthly || 0).toLocaleString('en-IN') ? '✅' : '❌'}`);

        console.log(`\nExpected Transport/Conveyance: ₹${conveyanceComp?.monthly || 0}`);
        console.log(`Mapped Transport: ${mappedData.transport_monthly}`);
        console.log(`Match: ${mappedData.transport_monthly === (conveyanceComp?.monthly || 0).toLocaleString('en-IN') ? '✅' : '❌'}`);

        console.log('\n🎉 Test Complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testEducationTransport();
