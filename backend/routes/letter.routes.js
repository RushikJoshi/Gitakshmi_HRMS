const express = require('express');
const router = express.Router();
const letterCtrl = require('../controllers/letter.controller');
const { authenticate, requireHr } = require('../middleware/auth.jwt');

console.log('Letter routes loaded');
console.log('uploadWordTemplate type:', typeof letterCtrl.uploadWordTemplate);
console.log('deleteTemplate type:', typeof letterCtrl.deleteTemplate); // DEBUG CHECK

// --- Specific Letter Generation Routes (Must be before wildcard :id routes) ---
router.post('/generate-offer', authenticate, requireHr, letterCtrl.generateOfferLetter);
router.post('/generate-joining', authenticate, requireHr, letterCtrl.generateJoiningLetter);
router.post('/preview-joining', authenticate, requireHr, letterCtrl.previewJoiningLetter);
router.post('/upload-word-template', authenticate, requireHr, letterCtrl.uploadWordTemplate);

// --- Company Profile (Branding) ---
router.get('/company-profile', authenticate, requireHr, letterCtrl.getCompanyProfile);
router.post('/company-profile', authenticate, requireHr, letterCtrl.updateCompanyProfile);

// --- Templates Management ---
router.post('/templates', authenticate, requireHr, letterCtrl.createTemplate);
router.get('/templates', letterCtrl.getTemplates);     // List all
router.get('/templates/:id', letterCtrl.getTemplateById); // Get One
router.put('/templates/:id', letterCtrl.updateTemplate);  // Update
router.delete('/templates/:id', authenticate, requireHr, letterCtrl.deleteTemplate); // Delete

// --- Word Template Upload (Joining Letters) ---
// IMPORTANT: uploadWordTemplate is an array [multer, handler]
router.post('/upload-word-template', authenticate, requireHr, letterCtrl.uploadWordTemplate);

// --- Word Template Preview (Convert to PDF) ---
router.get('/templates/:templateId/preview-pdf', letterCtrl.previewWordTemplatePDF);
router.get('/templates/:templateId/download-word', authenticate, requireHr, letterCtrl.downloadWordTemplate); // Download original .docx file
router.get('/templates/:templateId/download-pdf', letterCtrl.downloadWordTemplatePDF); // Download as PDF

// --- PDF Generate & Download ---
router.post('/templates/:templateId/download-pdf', authenticate, requireHr, letterCtrl.downloadLetterPDF);

// Generate Official Offer Letter (HTML/Image based)
router.post('/generate-offer', authenticate, requireHr, letterCtrl.generateOfferLetter);

// Generate Official Joining Letter (Word template based)
router.post('/generate-joining', authenticate, requireHr, letterCtrl.generateJoiningLetter);

// Preview Joining Letter with Applicant Data
router.post('/preview-joining', authenticate, requireHr, letterCtrl.previewJoiningLetter);

// --- History / Audit ---
router.get('/history', letterCtrl.getHistory);


// Ensure export
if (!module.exports) {
    module.exports = router;
} else {
    module.exports = router;
}
