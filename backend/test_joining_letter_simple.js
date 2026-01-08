async function testJoiningLetterDataMapping() {
    try {
        console.log('🔥 Testing Joining Letter Data Mapping Logic...\n');

        // Create mock applicant data
        const mockApplicant = {
            _id: '507f1f77bcf86cd799439011',
            name: 'John Doe',
            email: 'john.doe@test.com',
            mobile: '1234567890',
            experience: '5 years',
            status: 'Selected',
            joiningDate: new Date('2024-01-15'),
            workLocation: 'Mumbai, India',
            address: '123 Test Street, Test City',
            offerRefNo: 'OFFER/2025/1234',
            requirementId: {
                jobTitle: 'Software Engineer',
                department: 'IT'
            }
        };

        console.log(`👤 Using mock applicant: ${mockApplicant.name} (${mockApplicant._id})`);

        // Simulate the payload data from frontend (only allowed placeholders)
        const customData = {
            employee_name: 'John Doe',
            designation: 'Software Engineer',
            joining_date: '2024-01-15',
            department: 'IT',
            location: 'Mumbai, India',
            candidate_address: '123 Test Street, Test City',
            offer_ref_code: 'OFFER/2025/1234'
        };

        console.log('\n📤 Frontend payload customData (only allowed placeholders):');
        console.log(JSON.stringify(customData, null, 2));

        // Map data using joiningLetterUtils
        const joiningLetterUtils = require('./utils/joiningLetterUtils');
        const data = joiningLetterUtils.mapOfferToJoiningData(mockApplicant, customData);

        console.log('\n📊 Final data mapping result:');
        console.log(`Total available variables: ${Object.keys(data).length}`);

        console.log('\n🔍 Joining Letter Variables (allowed placeholders only):');
        Object.keys(data).sort().forEach(key => {
            console.log(`  ${key}: "${data[key]}"`);
        });

        console.log('\n✅ Data mapping test completed successfully!');
        console.log('\n💡 Template Usage Tips:');
        console.log('  - Joining letters use only these 8 placeholders:');
        console.log('    {{offer_ref_code}}, {{employee_name}}, {{designation}},');
        console.log('    {{department}}, {{location}}, {{candidate_address}},');
        console.log('    {{joining_date}}, {{current_date}}');
        console.log('  - All data comes from Offer Letter (applicant record)');
        console.log('  - No salary/annexure data included');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testJoiningLetterDataMapping();