const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/tenants', require('./tenant.routes'));
router.use('/users', require('./user.routes'));
router.use('/employees', require('./employee.routes'));
router.use('/department', require('./department.routes'));
router.use('/module', require('./module.routes'));

module.exports = router;
