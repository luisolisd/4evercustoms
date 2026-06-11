const router = require('express').Router({ mergeParams: true });
const ctrl = require('./quotes.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];

router.get('/', ...auth, ctrl.list);
router.post('/', ...adminOrTech, ctrl.create);
router.get('/:quoteId', ...auth, ctrl.getOne);
router.put('/:quoteId', ...adminOrTech, ctrl.update);
router.patch('/:quoteId/status', ...auth, ctrl.updateStatus);
router.post('/:quoteId/items', ...adminOrTech, ctrl.addItem);
router.delete('/:quoteId/items/:itemId', ...adminOrTech, ctrl.removeItem);
router.delete('/:quoteId', ...adminOrTech, ctrl.remove);

module.exports = router;
