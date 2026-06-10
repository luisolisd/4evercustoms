const router = require('express').Router();
const ctrl = require('./workshops.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');

router.post('/', authenticate, ctrl.createWorkshop);
router.get('/:workshopId', authenticate, workshopAccess(), ctrl.getWorkshop);
router.get('/:workshopId/users/me', authenticate, workshopAccess(), ctrl.getMyProfile);
router.put('/:workshopId/users/me', authenticate, workshopAccess(), ctrl.updateMe);
router.post('/:workshopId/users/me/change-password', authenticate, workshopAccess(), ctrl.changePassword);
router.put('/:workshopId', authenticate, workshopAccess('WORKSHOP_ADMIN'), ctrl.updateWorkshop);
router.get('/:workshopId/stats', authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN'), ctrl.getStats);
router.get('/:workshopId/users', authenticate, workshopAccess('WORKSHOP_ADMIN'), ctrl.listUsers);
router.post('/:workshopId/users', authenticate, workshopAccess('WORKSHOP_ADMIN'), ctrl.addUser);
router.patch('/:workshopId/users/:userId', authenticate, workshopAccess('WORKSHOP_ADMIN'), ctrl.updateUser);
router.delete('/:workshopId/users/:userId', authenticate, workshopAccess('WORKSHOP_ADMIN'), ctrl.removeUser);

module.exports = router;
