const router = require('express').Router();
const ctrl = require('../controllers/tenant.controller');
const auth = require('../middleware/auth.jwt');
// TODO: protect routes with auth/role middleware later (e.g., isSuperAdmin)

// Only register routes if the corresponding controller method exists
if (typeof ctrl.psaStats === 'function') {
	router.get('/psa/stats', ctrl.psaStats);
}

// tenant self info for HR users
if (typeof ctrl.getMyTenant === 'function') {
	router.get('/me', auth.authenticate, auth.requireHr, ctrl.getMyTenant);
}

if (typeof ctrl.listTenants === 'function') {
	router.get('/', ctrl.listTenants);
}

if (typeof ctrl.createTenant === 'function') {
	router.post('/', ctrl.createTenant);
}

if (typeof ctrl.getTenant === 'function') {
	router.get('/:id', ctrl.getTenant);
}

// Send activation email with credentials and activation link
if (typeof ctrl.sendActivationEmail === 'function') {
	router.post('/:id/send-activation', ctrl.sendActivationEmail);
}

// Send activation via SMS
if (typeof ctrl.sendActivationSms === 'function') {
    router.post('/:id/send-activation-sms', ctrl.sendActivationSms);
}

// Activation link handler
if (typeof ctrl.activateTenant === 'function') {
	router.get('/activate', ctrl.activateTenant);
}

if (typeof ctrl.updateTenant === 'function') {
	router.put('/:id', ctrl.updateTenant);
}

if (typeof ctrl.deleteTenant === 'function') {
	router.delete('/:id', ctrl.deleteTenant);
}

// modules
if (typeof ctrl.updateModules === 'function') {
	router.put('/:id/modules', ctrl.updateModules);
}

module.exports = router;
