const express = require('express');
const router = express.Router();
const deductionController = require('../controllers/deduction.controller');
const auth = require('../middleware/auth.jwt');
const tenantMiddleware = require('../middleware/tenant.middleware');

// Public prefix handled in index.js: /api/deductions and /api/employee-deductions

// Master Deduction Routes
router.post('/deductions/create', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.createDeduction);
router.get('/deductions', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.getDeductions);
router.put('/deductions/:id', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.updateDeduction);
router.patch('/deductions/:id/status', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.updateStatus);
router.delete('/deductions/:id', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.deleteDeduction);

// Employee Deduction Routes
router.post('/employee-deductions/assign', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.assignToEmployee);
router.get('/employee-deductions/:employeeId', auth.authenticate, auth.requireHr, tenantMiddleware, deductionController.getEmployeeDeductions);

module.exports = router;
