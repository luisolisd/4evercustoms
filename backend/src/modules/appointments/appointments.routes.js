const router = require('express').Router({ mergeParams: true });
const ctrl = require('./appointments.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];

router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.get('/:appointmentId', ...staff, ctrl.getOne);
router.put('/:appointmentId', ...staff, ctrl.update);
router.patch('/:appointmentId/status', ...staff, ctrl.updateStatus);
router.patch('/:appointmentId/cancel', ...staff, ctrl.cancel);
router.delete('/:appointmentId', ...staff, ctrl.remove);

module.exports = router;
