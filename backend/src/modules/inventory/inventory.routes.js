const router = require('express').Router({ mergeParams: true });
const ctrl = require('./inventory.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { ADMIN, STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];
const adminOnly = [authenticate, workshopAccess(ADMIN)];

// Parts
router.get('/parts', ...staff, ctrl.listParts);
router.post('/parts', ...staff, ctrl.createPart);
router.put('/parts/:partId', ...staff, ctrl.updatePart);
router.delete('/parts/:partId', ...adminOnly, ctrl.deletePart);

// Inventory
router.get('/inventory', ...staff, ctrl.listInventory);
router.post('/inventory/movements', ...staff, ctrl.addMovement);
router.get('/inventory/low-stock', ...staff, ctrl.lowStock);

module.exports = router;
