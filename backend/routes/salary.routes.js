const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');
const salaryCtrl = require('../controllers/salary.controller');

// Root protection
router.use(auth.authenticate);
router.use(auth.requireHr);

// Salary Operations
router.post('/assign', salaryCtrl.assign);
router.post('/confirm', salaryCtrl.confirm);
router.post('/preview', salaryCtrl.preview);
router.get('/preview', salaryCtrl.preview);

module.exports = router;
