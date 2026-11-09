const router = require('express').Router({ mergeParams: true });
const ctrl = require('./dashboard.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

router.get('/', authenticate, workshopAccess(...STAFF), ctrl.getDashboard);

module.exports = router;
