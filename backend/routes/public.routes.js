const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

const { authenticate } = require('../middleware/auth.jwt');

// Public job application route (no auth required)
// Public job application route (no auth required)
router.get('/jobs', publicController.getPublicJobs);
router.get('/resolve-code/:code', publicController.resolveCompanyCode); // New endpoint
router.get('/jobs/:companyCode', publicController.getPublicJobsByCompanyCode);
router.get('/job/:id', publicController.getPublicJobById);
router.post('/apply-job', publicController.applyJob);

module.exports = router;