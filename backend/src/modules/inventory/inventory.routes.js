const router = require('express').Router({ mergeParams: true });
const ctrl = require('./inventory.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];
const adminOnly = [authenticate, workshopAccess('WORKSHOP_ADMIN')];

// Parts
router.get('/parts', ...auth, ctrl.listParts);
router.post('/parts', ...adminOrTech, ctrl.createPart);
router.put('/parts/:partId', ...adminOrTech, ctrl.updatePart);
router.delete('/parts/:partId', ...adminOnly, ctrl.deletePart);

// Inventory
router.get('/inventory', ...auth, ctrl.listInventory);
router.post('/inventory/movements', ...adminOrTech, ctrl.addMovement);
router.get('/inventory/low-stock', ...auth, ctrl.lowStock);

module.exports = router;
