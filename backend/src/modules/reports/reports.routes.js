const router = require('express').Router({ mergeParams: true });
const ctrl = require('./reports.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const admin = [authenticate, workshopAccess('WORKSHOP_ADMIN')];

router.get('/summary', ...admin, ctrl.summary);
router.get('/revenue', ...admin, ctrl.revenue);
router.get('/orders-by-status', ...admin, ctrl.ordersByStatus);
router.get('/top-services', ...admin, ctrl.topServices);

module.exports = router;
