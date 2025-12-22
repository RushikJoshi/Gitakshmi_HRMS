const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');
const reqCtrl = require('../controllers/requirement.controller');
const offerCtrl = require('../controllers/offer.controller');

// Protect all routes with authentication and HR role
// router.use(auth.authenticate);
// router.use(auth.requireHr);

// Routes
router.post('/create', reqCtrl.createRequirement);
router.get('/list', reqCtrl.getRequirements);
router.get('/applicants', reqCtrl.getApplicants);
router.post('/offer-letter/:applicantId', offerCtrl.generateOfferLetter);

module.exports = router;