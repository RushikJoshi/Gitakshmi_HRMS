const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { generateJoiningLetter } = require('./controllers/letter.controller');
const ApplicantSchema = require('./models/Applicant');
const Applicant = mongoose.models.Applicant || mongoose.model('Applicant', ApplicantSchema);
const LetterTemplate = require('./models/LetterTemplate');

// Mock Express Request/Response
const mockRes = () => {
    const res = {};
    res.statusCode = 200; // Default status
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const fs = require('fs');
const logFile = './test_joining_from_applicant.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};
// Clear log
fs.writeFileSync(logFile, '');

const runTest = async () => {
    let testApplicantId = null;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('✅ DB Connected');

        const template = await LetterTemplate.findOne({ type: 'joining' });
        if (!template) throw new Error('No joining template found');
        log('Found Template: ' + template._id);

        // CREATE TEST APPLICANT with persisted offer data
        log('Creating Test Applicant with persisted offer data...');
        const testApplicant = await Applicant.create({
            name: 'Test Joining From Applicant',
            email: `test_joining_applicant_${Date.now()}@example.com`,
            mobile: '1234567890',
            experience: '5',
            requirementId: new mongoose.Types.ObjectId(), // Fake Requirement ID
            joiningDate: new Date('2024-03-15'),
            address: '456 Complete Test Avenue, Test City, Test State 12345',
            department: 'Information Technology',
            location: 'Mumbai, Maharashtra',
            offerRefCode: 'OFFER/2024/JOINING123',
            status: 'Selected',
            offerLetterPath: 'offers/mock_offer.pdf' // Mock offer letter path
        });
        testApplicantId = testApplicant._id;
        log('Created Test Applicant: ' + testApplicantId);

        const validUserId = new mongoose.Types.ObjectId().toString(); // Valid dummy ID

        // Test joining letter generation
        log(`\n--- TEST: Joining Letter Reading from Applicant Record ---`);

        const req = {
            user: { tenantId: template.tenantId, userId: validUserId },
            body: {
                applicantId: testApplicantId,
                templateId: template._id
                // Note: No customData - joining letter should read from applicant record only
            }
        };

        const res = mockRes();

        // Mock the PDF generation to avoid actual file operations
        const originalDocxtemplater = require('docxtemplater');
        const mockDoc = {
            render: () => {},
            getZip: () => ({ generate: () => Buffer.from('mock pdf content') })
        };

        // We'll let the actual generation run but capture the data
        await generateJoiningLetter(req, res);

        if (res.statusCode === 200 && res.data) {
            log('✅ PASS: Joining letter generated successfully');
            log('Joining letter should have used data directly from applicant record:');
            log('- joiningDate: persisted in applicant.joiningDate');
            log('- address: persisted in applicant.address');
            log('- department: persisted in applicant.department');
            log('- location: persisted in applicant.location');
            log('- offerRefCode: persisted in applicant.offerRefCode');
        } else {
            log(`❌ FAIL: Joining letter generation failed. Status: ${res.statusCode} Msg: ${JSON.stringify(res.data)}`);
        }

        // Verify the applicant data is still intact
        const finalApplicant = await Applicant.findById(testApplicantId);
        log(`\nFinal Applicant Data Verification:`);
        log(`Joining Date: ${finalApplicant.joiningDate}`);
        log(`Address: ${finalApplicant.address}`);
        log(`Department: ${finalApplicant.department}`);
        log(`Location: ${finalApplicant.location}`);
        log(`Offer Ref Code: ${finalApplicant.offerRefCode}`);

        // Check that all persisted data is correct
        const expectedJoiningDate = new Date('2024-03-15');
        if (finalApplicant.joiningDate && finalApplicant.joiningDate.getTime() === expectedJoiningDate.getTime()) {
            log('✅ PASS: Joining date preserved correctly');
        } else {
            log(`❌ FAIL: Joining date changed. Expected: ${expectedJoiningDate}, Got: ${finalApplicant.joiningDate}`);
        }

        if (finalApplicant.address === '456 Complete Test Avenue, Test City, Test State 12345') {
            log('✅ PASS: Address preserved correctly');
        } else {
            log(`❌ FAIL: Address changed. Got: "${finalApplicant.address}"`);
        }

        if (finalApplicant.department === 'Information Technology') {
            log('✅ PASS: Department preserved correctly');
        } else {
            log(`❌ FAIL: Department changed. Got: "${finalApplicant.department}"`);
        }

        if (finalApplicant.location === 'Mumbai, Maharashtra') {
            log('✅ PASS: Location preserved correctly');
        } else {
            log(`❌ FAIL: Location changed. Got: "${finalApplicant.location}"`);
        }

    } catch (error) {
        log(`❌ ERROR: ${error.message}`);
        console.error(error);
    } finally {
        // Cleanup
        if (testApplicantId) {
            try {
                await Applicant.findByIdAndDelete(testApplicantId);
                log('🧹 Cleaned up test applicant');
            } catch (cleanupError) {
                log(`⚠️  Cleanup warning: ${cleanupError.message}`);
            }
        }
        await mongoose.disconnect();
        log('✅ DB Disconnected');
    }
};

runTest();