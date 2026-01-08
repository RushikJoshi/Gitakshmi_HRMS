const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { generateOfferLetter } = require('./controllers/letter.controller');
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
const logFile = './test_offer_complete_persistence.txt';
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

        // Get a template for offer letter
        const template = await LetterTemplate.findOne({ type: 'offer' });
        if (!template) {
            log('❌ No offer template found, creating mock template...');
            // For testing purposes, we'll skip template requirement
        }

        // CREATE TEST APPLICANT
        log('Creating Test Applicant...');
        const testApplicant = await Applicant.create({
            name: 'Test Complete Persistence',
            email: `test_complete_${Date.now()}@example.com`,
            mobile: '1234567890',
            experience: '5',
            requirementId: new mongoose.Types.ObjectId(), // Fake Requirement ID
            status: 'Applied'
        });
        testApplicantId = testApplicant._id;
        log('Created Test Applicant: ' + testApplicantId);

        const validUserId = new mongoose.Types.ObjectId().toString(); // Valid dummy ID
        const validTenantId = new mongoose.Types.ObjectId().toString(); // Valid dummy tenant ID

        // Test offer letter generation with all required fields
        log(`\n--- TEST: Offer Letter Generation with Complete Data Persistence ---`);

        const testJoiningDate = '2024-03-15';
        const testAddress = '456 Complete Test Avenue, Test City, Test State 12345';
        const testDepartment = 'Information Technology';
        const testLocation = 'Mumbai, Maharashtra';

        const req = {
            user: { tenantId: validTenantId, userId: validUserId },
            body: {
                applicantId: testApplicantId,
                templateId: template ? template._id : new mongoose.Types.ObjectId(),
                imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Minimal 1x1 transparent PNG
                refNo: 'OFFER/2024/COMPLETE123',
                joiningDate: testJoiningDate,
                address: testAddress,
                department: testDepartment,
                location: testLocation
            }
        };

        const res = mockRes();

        // Mock the letterPDFGenerator to avoid actual PDF generation
        const originalGeneratePDF = require('./services/letterPDFGenerator').generatePDF;
        require('./services/letterPDFGenerator').generatePDF = async () => {
            return { filename: 'test_complete_offer.pdf' };
        };

        await generateOfferLetter(req, res);

        // Restore original function
        require('./services/letterPDFGenerator').generatePDF = originalGeneratePDF;

        if (res.statusCode === 200 && res.data.success) {
            log('✅ PASS: Offer letter generated successfully');

            // Verify data persistence
            const updatedApplicant = await Applicant.findById(testApplicantId);
            log(`Applicant status: ${updatedApplicant.status}`);
            log(`Offer letter path: ${updatedApplicant.offerLetterPath}`);
            log(`Offer ref code: ${updatedApplicant.offerRefCode}`);
            log(`Joining date: ${updatedApplicant.joiningDate}`);
            log(`Address: ${updatedApplicant.address}`);
            log(`Department: ${updatedApplicant.department}`);
            log(`Location: ${updatedApplicant.location}`);

            // Check if all fields were persisted
            const expectedJoiningDate = new Date(testJoiningDate);
            if (updatedApplicant.joiningDate && updatedApplicant.joiningDate.getTime() === expectedJoiningDate.getTime()) {
                log('✅ PASS: Joining date persisted correctly');
            } else {
                log(`❌ FAIL: Joining date not persisted. Expected: ${expectedJoiningDate}, Got: ${updatedApplicant.joiningDate}`);
            }

            if (updatedApplicant.address === testAddress) {
                log('✅ PASS: Address persisted correctly');
            } else {
                log(`❌ FAIL: Address not persisted. Expected: "${testAddress}", Got: "${updatedApplicant.address}"`);
            }

            if (updatedApplicant.department === testDepartment) {
                log('✅ PASS: Department persisted correctly');
            } else {
                log(`❌ FAIL: Department not persisted. Expected: "${testDepartment}", Got: "${updatedApplicant.department}"`);
            }

            if (updatedApplicant.location === testLocation) {
                log('✅ PASS: Location persisted correctly');
            } else {
                log(`❌ FAIL: Location not persisted. Expected: "${testLocation}", Got: "${updatedApplicant.location}"`);
            }

            if (updatedApplicant.offerRefCode === 'OFFER/2024/COMPLETE123') {
                log('✅ PASS: Offer ref code persisted correctly');
            } else {
                log(`❌ FAIL: Offer ref code not persisted. Expected: "OFFER/2024/COMPLETE123", Got: "${updatedApplicant.offerRefCode}"`);
            }

        } else {
            log(`❌ FAIL: Offer letter generation failed. Status: ${res.statusCode} Msg: ${JSON.stringify(res.data)}`);
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