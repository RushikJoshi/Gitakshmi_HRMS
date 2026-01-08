const express = require('express');
const router = express.Router();
const controller = require('../controllers/offerTemplate.controller');
const auth = require('../middleware/auth.jwt');

console.log('[OFFER_TEMPLATE_ROUTES] Loading offer template routes');

router.use(auth.authenticate);
router.use(auth.requireHr);

router.get('/', controller.getTemplates);
router.get('/:id', controller.getTemplateById);
router.post('/', controller.createTemplate);
router.put('/:id', controller.updateTemplate);
router.delete('/:id', controller.deleteTemplate);

module.exports = router;
