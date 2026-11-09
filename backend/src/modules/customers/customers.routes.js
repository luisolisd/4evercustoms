const router = require('express').Router({ mergeParams: true });
const ctrl = require('./customers.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { ADMIN, STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];
const adminOnly = [authenticate, workshopAccess(ADMIN)];

router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.get('/:customerId', ...staff, ctrl.getOne);
router.put('/:customerId', ...staff, ctrl.update);
router.delete('/:customerId', ...adminOnly, ctrl.remove);

module.exports = router;
