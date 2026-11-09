const router = require('express').Router({ mergeParams: true });
const ctrl = require('./reminders.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];

router.get('/', ...staff, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.put('/:id', ...staff, ctrl.update);
router.post('/:id/contact', ...staff, ctrl.contact);
router.patch('/:id/status', ...staff, ctrl.setStatus);
router.delete('/:id', ...staff, ctrl.remove);

module.exports = router;
