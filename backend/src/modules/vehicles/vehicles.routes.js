const router = require('express').Router({ mergeParams: true });
const ctrl = require('./vehicles.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];

router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.get('/:vehicleId', ...staff, ctrl.getOne);
router.put('/:vehicleId', ...staff, ctrl.update);
router.delete('/:vehicleId', ...staff, ctrl.remove);
router.get('/:vehicleId/history', ...staff, ctrl.getHistory);

module.exports = router;
