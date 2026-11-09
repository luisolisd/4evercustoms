const router = require('express').Router({ mergeParams: true });
const ctrl = require('./quotes.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];

router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.get('/:quoteId', ...staff, ctrl.getOne);
router.put('/:quoteId', ...staff, ctrl.update);
router.patch('/:quoteId/status', ...staff, ctrl.updateStatus);
router.post('/:quoteId/items', ...staff, ctrl.addItem);
router.delete('/:quoteId/items/:itemId', ...staff, ctrl.removeItem);
router.delete('/:quoteId', ...staff, ctrl.remove);

module.exports = router;
