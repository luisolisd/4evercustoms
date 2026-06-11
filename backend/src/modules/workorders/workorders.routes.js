const router = require('express').Router({ mergeParams: true });
const ctrl = require('./workorders.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];
const adminOnly = [authenticate, workshopAccess('WORKSHOP_ADMIN')];

router.get('/', ...auth, ctrl.list);
router.post('/', ...adminOrTech, ctrl.create);
router.get('/:orderId', ...auth, ctrl.getOne);
router.put('/:orderId', ...adminOrTech, ctrl.update);
router.patch('/:orderId/status', ...adminOrTech, ctrl.updateStatus);
router.patch('/:orderId/payment', ...adminOrTech, ctrl.updatePayment);
router.post('/:orderId/parts', ...adminOrTech, ctrl.addPart);
router.delete('/:orderId/parts/:partId', ...adminOrTech, ctrl.removePart);

module.exports = router;
