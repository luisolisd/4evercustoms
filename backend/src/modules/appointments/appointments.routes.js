const router = require('express').Router({ mergeParams: true });
const ctrl = require('./appointments.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];

router.get('/', ...auth, ctrl.list);
router.post('/', ...auth, ctrl.create);
router.get('/:appointmentId', ...auth, ctrl.getOne);
router.put('/:appointmentId', ...adminOrTech, ctrl.update);
router.patch('/:appointmentId/status', ...adminOrTech, ctrl.updateStatus);
router.patch('/:appointmentId/cancel', ...adminOrTech, ctrl.cancel);
router.delete('/:appointmentId', ...adminOrTech, ctrl.remove);

module.exports = router;
