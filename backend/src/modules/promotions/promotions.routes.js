const router = require('express').Router({ mergeParams: true });
const ctrl = require('./promotions.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const manage = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];

router.get('/', ...manage, ctrl.list);
router.post('/', ...manage, ctrl.create);
router.patch('/:id/toggle', ...manage, ctrl.toggle);
router.delete('/:id', ...manage, ctrl.remove);

module.exports = router;
