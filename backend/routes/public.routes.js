const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Public job application route (no auth required)
router.get('/jobs', publicController.getPublicJobs);
router.get('/jobs/:companyCode', publicController.getPublicJobsByCompanyCode);
router.post('/apply-job', publicController.applyJob);

module.exports = router;