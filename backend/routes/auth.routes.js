const express = require('express');
const router = express.Router();

// import controllers
const authCtrl = require('../controllers/auth.controller');

// Register route only if provided by controller (optional)
if (typeof authCtrl.registerController === 'function') {
  router.post('/register', authCtrl.registerController);
}

// LOGIN (Super Admin login)
router.post('/login', authCtrl.loginController);

// HR tenant admin login (company code + email + password)
router.post('/login-hr', authCtrl.loginHrController);

// Employee login by employeeId + password
router.post('/login-employee', authCtrl.loginEmployeeController);

module.exports = router;
