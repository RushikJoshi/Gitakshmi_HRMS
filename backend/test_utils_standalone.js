const joiningLetterUtils = require('./utils/joiningLetterUtils');

const mockApplicant = {
    name: 'OfferName',
    currentDesignation: 'OfferDesignation',
    joiningDate: '2025-01-01',
    address: 'OfferAddress'
};

const userPayloadWithEmptyAddress = {
    EMPLOYEE_NAME: 'FormName',
    DESIGNATION: 'FormDesignation',
    JOINING_DATE: '2025-02-02',
    ADDRESS: '' // EXPECTATION: This should propagate as '' (empty) because it's present but empty? 
    // OR if we strictly follow "Joining Letter should AUTO-FETCH ... FROM OFFER LETTER if not provided in UI".
    // "Fallback priority: joiningPayload -> offerLetterData -> ''"
    // If joiningPayload is '', is it "provided"?
    // In my code: if (joiningValue !== undefined && joiningValue !== null && String(joiningValue).trim() !== '') return joiningValue;
    // So if it is '', it falls through to offerData.
    // So EXPECTATION: OfferAddress (because 'If placeholder value is undefined/null -> replace with ''... Wait.
    // The requirement: "Address can be EMPTY and must NOT break generation."
    // BUT "Offer -> Joining Fallback ... If joining payload misses ... THEN automatically fetch".
    // If I explicitly send empty string, did I "miss" it?
    // My previous thought: If user clears it, maybe they want empty.
    // But my code impl: Falls back to Offer if empty string!
    // Let's verify what happens.
};

const mapped = joiningLetterUtils.mapOfferToJoiningData(mockApplicant, userPayloadWithEmptyAddress);

const fs = require('fs');
const path = require('path');

const logBuffer = [];
const log = (...args) => logBuffer.push(args.join(' '));

log('Mapped ADDRESS:', `"${mapped.ADDRESS}"`);
log('Mapped EMPLOYEE_NAME:', `"${mapped.EMPLOYEE_NAME}"`);

if (mapped.ADDRESS === 'OfferAddress') {
    log('✅ Fallback worked: Empty form address -> Offer address');
} else if (mapped.ADDRESS === '') {
    log('❓ Address is empty (Strict form adherence) - Wait, logic says it should fallback!');
} else {
    log('❌ Unexpected address:', mapped.ADDRESS);
}

// Case 2: Missing in form, missing in offer
const emptyApplicant = {};
const emptyPayload = {};
const mapped2 = joiningLetterUtils.mapOfferToJoiningData(emptyApplicant, emptyPayload);
log('Double Missing ADDRESS:', `"${mapped2.ADDRESS}"`);
if (mapped2.ADDRESS === '') {
    log('✅ Fallback to empty string for missing address');
} else {
    log('❌ Failed: Should be empty string, got:', mapped2.ADDRESS);
}

fs.writeFileSync(path.join(__dirname, 'test_result.txt'), logBuffer.join('\n'));
