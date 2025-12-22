const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');

const empCtrl = require('../controllers/hr.employee.controller');
const deptCtrl = require('../controllers/hr.department.controller');
const policyCtrl = require('../controllers/leavePolicy.controller');
const requestCtrl = require('../controllers/leaveRequest.controller');

/* -----------------------------------------
   EMPLOYEES
----------------------------------------- */
router.get('/hr/employees', auth.authenticate, auth.requireHr, empCtrl.list);
router.post('/hr/employees', auth.authenticate, auth.requireHr, empCtrl.create);

// ⚠️ SPECIFIC ROUTES BEFORE GENERIC :ID ROUTES (important for Express routing)
// Employee ID Preview (Auto-generate preview request)
router.post('/hr/employees/preview', auth.authenticate, auth.requireHr, empCtrl.preview);

router.get('/hr/employees/me', auth.authenticate, empCtrl.me);
router.get('/hr/employees/top-level', auth.authenticate, auth.requireHr, empCtrl.getTopLevelEmployees);
router.get('/hr/employees/hierarchy', auth.authenticate, auth.requireHr, empCtrl.getHierarchy);

// Generic :id routes
router.get('/hr/employees/:id', auth.authenticate, auth.requireHr, empCtrl.get);
router.put('/hr/employees/:id', auth.authenticate, auth.requireHr, empCtrl.update);
router.delete('/hr/employees/:id', auth.authenticate, auth.requireHr, empCtrl.remove);
router.post('/hr/employees/:id/set-manager', auth.authenticate, auth.requireHr, empCtrl.setManager);
router.delete('/hr/employees/:id/manager', auth.authenticate, auth.requireHr, empCtrl.removeManager);
router.get('/hr/employees/:id/direct-reports', auth.authenticate, auth.requireHr, empCtrl.directReports);
router.get('/hr/employees/:id/manager', auth.authenticate, auth.requireHr, empCtrl.getManager);
router.get('/hr/employees/:id/reporting-chain', auth.authenticate, auth.requireHr, empCtrl.reportingChain);
router.get('/hr/employees/:id/org-tree', auth.authenticate, auth.requireHr, empCtrl.orgTree);

/* -----------------------------------------
   ORG ROOT & COMPANY TREE
----------------------------------------- */
router.get('/hr/org/root', auth.authenticate, auth.requireHr, empCtrl.getOrgRoot);
router.post('/hr/org/root', auth.authenticate, auth.requireHr, empCtrl.setOrgRoot);
router.get('/hr/org/tree', auth.authenticate, auth.requireHr, empCtrl.companyOrgTree);

/* -----------------------------------------
   DEPARTMENTS
----------------------------------------- */
router.get('/hr/departments', auth.authenticate, auth.requireHr, deptCtrl.list);
router.post('/hr/departments', auth.authenticate, auth.requireHr, deptCtrl.create);
router.put('/hr/departments/:id', auth.authenticate, auth.requireHr, deptCtrl.update);
router.delete('/hr/departments/:id', auth.authenticate, auth.requireHr, deptCtrl.remove);
router.get('/hr/departments/hierarchy/full', auth.authenticate, auth.requireHr, deptCtrl.getFullOrgHierarchy);

/* -----------------------------------------
   LEAVES
----------------------------------------- */
/* -----------------------------------------
   LEAVE POLICIES
----------------------------------------- */
// Test route
router.get('/hr/leave-policies/test', auth.authenticate, auth.requireHr, (req, res) => {
   res.json({ message: 'Test route works', user: req.user, tenantId: req.tenantId });
});

router.post('/hr/leave-policies', auth.authenticate, auth.requireHr, policyCtrl.createPolicy);
router.get('/hr/leave-policies', auth.authenticate, auth.requireHr, policyCtrl.getPolicies);
router.get('/hr/leave-policies/:id', auth.authenticate, auth.requireHr, policyCtrl.getPolicyById);
router.put('/hr/leave-policies/:id', auth.authenticate, auth.requireHr, policyCtrl.updatePolicy);
router.patch('/hr/leave-policies/:id/status', auth.authenticate, auth.requireHr, policyCtrl.togglePolicyStatus);
router.delete('/hr/leave-policies/:id', auth.authenticate, auth.requireHr, policyCtrl.deletePolicy);
router.post('/hr/assign-policy', auth.authenticate, auth.requireHr, policyCtrl.assignPolicyToEmployee);

/* -----------------------------------------
   REGULARIZATION (Admin)
----------------------------------------- */
const regCtrl = require('../controllers/regularization.controller');
router.get('/hr/regularization', auth.authenticate, auth.requireHr, regCtrl.getAllRequests);
router.post('/hr/regularization/:id/approve', auth.authenticate, auth.requireHr, regCtrl.approveRequest);
router.post('/hr/regularization/:id/reject', auth.authenticate, auth.requireHr, regCtrl.rejectRequest);

/* -----------------------------------------
   LEAVE REQUESTS (HR APPROVALS)
----------------------------------------- */
router.get('/hr/leaves/requests', auth.authenticate, auth.requireHr, requestCtrl.getAllLeaves);
router.post('/hr/leaves/requests/:id/approve', auth.authenticate, auth.requireHr, requestCtrl.approveLeave);
router.post('/hr/leaves/requests/:id/reject', auth.authenticate, auth.requireHr, requestCtrl.rejectLeave);

// Offer Templates
router.use('/hr/offer-templates', require('./offerTemplate.routes'));

module.exports = router;
