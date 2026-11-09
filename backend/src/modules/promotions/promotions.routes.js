const router = require('express').Router({ mergeParams: true });
const ctrl = require('./promotions.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];

router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.patch('/:id/toggle', ...staff, ctrl.toggle);
router.delete('/:id', ...staff, ctrl.remove);

module.exports = router;
