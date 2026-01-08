const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');
const empCtrl = require('../controllers/employee.controller');
const employeeSalaryController = require('../controllers/employeeSalary.controller');
const requestCtrl = require('../controllers/leaveRequest.controller');
const attendCtrl = require('../controllers/attendance.controller'); // Import Attendance Controller

// profile
router.get('/profile', auth.authenticate, empCtrl.getProfile);

// attendance
router.post('/attendance/toggle', auth.authenticate, attendCtrl.punch); // Use robust punch controller
router.get('/attendance', auth.authenticate, attendCtrl.getMyAttendance);

// leaves
router.post('/leaves/apply', auth.authenticate, requestCtrl.applyLeave);
router.put('/leaves/edit/:id', auth.authenticate, requestCtrl.editLeave);
router.post('/leaves/cancel/:id', auth.authenticate, requestCtrl.cancelLeave);
router.get('/leaves/history', auth.authenticate, requestCtrl.getMyLeaves);
router.get('/leaves/balances', auth.authenticate, requestCtrl.getMyBalances);
// Regularization
const regCtrl = require('../controllers/regularization.controller');
router.post('/regularization', auth.authenticate, regCtrl.createRequest);
router.get('/regularization/my', auth.authenticate, regCtrl.getMyRequests);

// Team Lead routes
router.get('/leaves/team-requests', auth.authenticate, requestCtrl.getTeamLeaves);
router.post('/leaves/requests/:id/approve', auth.authenticate, requestCtrl.approveLeave);
router.post('/leaves/requests/:id/reject', auth.authenticate, requestCtrl.rejectLeave);

router.get('/regularization/team-requests', auth.authenticate, regCtrl.getTeamRequests);
router.post('/regularization/requests/:id/approve', auth.authenticate, regCtrl.approveRequest);
router.post('/regularization/requests/:id/reject', auth.authenticate, regCtrl.rejectRequest);


// payslips (mock)
router.get('/payslips', auth.authenticate, empCtrl.getPayslips);
router.get('/reporting-tree', auth.authenticate, empCtrl.getReportingTree);

// Salary Assignment (New Requirement)
router.post('/:id/salary-assignment', auth.requireHr, employeeSalaryController.assignSalary);
router.get('/:id/salary-assignment', auth.requireHr, employeeSalaryController.getSalaryAssignment);

module.exports = router;
// exported above
