const router = require('express').Router({ mergeParams: true });
const ctrl = require('./customers.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];

router.get('/', ...auth, ctrl.list);
router.post('/', ...adminOrTech, ctrl.create);
router.get('/:customerId', ...auth, ctrl.getOne);
router.put('/:customerId', ...adminOrTech, ctrl.update);
router.delete('/:customerId', authenticate, workshopAccess('WORKSHOP_ADMIN'), ctrl.remove);

module.exports = router;
