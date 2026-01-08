const express = require('express');
const router = express.Router();
const candidateCtrl = require('../controllers/candidate.controller');
const { authenticate } = require('../middleware/auth.jwt');

// Public routes (Auth)
router.post('/register', candidateCtrl.registerCandidate);
router.post('/login', candidateCtrl.loginCandidate);

// Protected routes
router.get('/dashboard', authenticate, candidateCtrl.getCandidateDashboard);
router.get('/check-status/:requirementId', authenticate, candidateCtrl.checkApplicationStatus);

module.exports = router;
