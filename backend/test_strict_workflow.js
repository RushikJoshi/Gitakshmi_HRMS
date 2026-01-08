const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { generateJoiningLetter } = require('./controllers/letter.controller');
const ApplicantSchema = require('./models/Applicant');
const Applicant = mongoose.models.Applicant || mongoose.model('Applicant', ApplicantSchema);
const RequirementSchema = require('./models/Requirement');
const Requirement = mongoose.models.Requirement || mongoose.model('Requirement', RequirementSchema);
const LetterTemplate = require('./models/LetterTemplate');

// Mock Express Request/Response
const mockRes = () => {
    const res = {};
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
const logFile = './test_strict_output.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};
// Clear log
fs.writeFileSync(logFile, '');

// ... (imports)

const runTest = async () => {
    let testApplicantId = null;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('✅ DB Connected');

        const template = await LetterTemplate.findOne({ type: 'joining' });
        if (!template) throw new Error('No joining template found');
        log('Found Template: ' + template._id);

        // CREATE TEST APPLICANT
        log('Creating Test Applicant...');
        const testApplicant = await Applicant.create({
            name: 'Test Strict Workflow',
            email: `test_strict_${Date.now()}@example.com`,
            mobile: '1234567890',
            experience: '5',
            requirementId: new mongoose.Types.ObjectId(), // Fake Requirement ID
            joiningDate: new Date(),
            status: 'Selected',
            offerLetterPath: null // Initially NO offer letter
        });
        testApplicantId = testApplicant._id;
        log('Created Test Applicant: ' + testApplicantId);

        const validUserId = new mongoose.Types.ObjectId().toString(); // Valid dummy ID

        // 2. Test Case A: NO Offer Letter (Should Fail)
        log(`\n--- TEST CASE A: No Offer Letter ---`);
        const reqBad = {
            user: { tenantId: template.tenantId, userId: validUserId },
            body: {
                applicantId: testApplicantId,
                templateId: template._id,
                customData: { JOINING_DATE: '2025-01-01' }
            }
        };

        const resBad = mockRes();
        await generateJoiningLetter(reqBad, resBad);

        if (resBad.statusCode === 400 && resBad.data.message.includes('Offer Letter must be generated')) {
            log('✅ PASS: Blocked missing offer letter.');
        } else {
            log(`❌ FAIL: Did not block missing offer letter. Status: ${resBad.statusCode} Msg: ${JSON.stringify(resBad.data)}`);
        }

        // 3. Test Case B: Success (Mock Offer Letter)
        log(`\n--- TEST CASE B: Valid Offer Letter ---`);
        testApplicant.offerLetterPath = 'offers/mock_offer.pdf';
        await testApplicant.save();
        log('Updated Test Applicant with Fake Offer Path');

        const reqGood = {
            user: { tenantId: template.tenantId, userId: validUserId },
            body: {
                applicantId: testApplicantId,
                templateId: template._id,
                customData: { JOINING_DATE: '2025-01-01' }
            }
        };

        const resGood = mockRes();
        await generateJoiningLetter(reqGood, resGood);

        if (resGood.data && resGood.data.success) {
            log('✅ PASS: Generated Joining Letter successfully.');
            log('PDF Path: ' + resGood.data.pdfPath);
        } else {
            log(`❌ FAIL: Failed to generate valid joining letter. Status: ${resGood.statusCode} Msg: ${JSON.stringify(resGood.data)}`);
            if (resGood.statusCode === 500) log('Error Details: ' + JSON.stringify(resGood.data));
        }

    } catch (err) {
        log('TEST ERROR: ' + err);
    } finally {
        if (testApplicantId) {
            await Applicant.findByIdAndDelete(testApplicantId);
            log('Cleaned up Test Applicant');
        }
        mongoose.connection.close();
    }
};

runTest();
