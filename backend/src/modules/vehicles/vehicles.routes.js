const router = require('express').Router({ mergeParams: true });
const ctrl = require('./vehicles.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];

router.get('/', ...auth, ctrl.list);
router.post('/', ...adminOrTech, ctrl.create);
router.get('/:vehicleId', ...auth, ctrl.getOne);
router.put('/:vehicleId', ...adminOrTech, ctrl.update);
router.delete('/:vehicleId', ...adminOrTech, ctrl.remove);
router.get('/:vehicleId/history', ...auth, ctrl.getHistory);

module.exports = router;
