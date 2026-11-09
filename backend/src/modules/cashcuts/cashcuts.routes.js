const router = require('express').Router({ mergeParams: true });
const ctrl = require('./cashcuts.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];

router.get('/preview', ...staff, ctrl.preview);
router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);

module.exports = router;
