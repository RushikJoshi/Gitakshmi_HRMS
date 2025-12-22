const router = require('express').Router();
const ctrl = require('../controllers/tenant.controller');

// Public verification link
if (typeof ctrl.verifyCompany === 'function') {
  router.get('/verify-company/:token', ctrl.verifyCompany);
}

module.exports = router;
