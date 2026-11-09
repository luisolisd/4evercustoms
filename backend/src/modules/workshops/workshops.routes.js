const router = require('express').Router();
const ctrl = require('./workshops.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { ADMIN, STAFF, ALL } = require('../../utils/roles');

router.get('/:workshopId', authenticate, workshopAccess(...ALL), ctrl.getWorkshop);
router.get('/:workshopId/users/me', authenticate, workshopAccess(...ALL), ctrl.getMyProfile);
router.put('/:workshopId/users/me', authenticate, workshopAccess(...ALL), ctrl.updateMe);
router.post('/:workshopId/users/me/change-password', authenticate, workshopAccess(...ALL), ctrl.changePassword);
router.put('/:workshopId', authenticate, workshopAccess(ADMIN), ctrl.updateWorkshop);

// Equipo
router.get('/:workshopId/technicians', authenticate, workshopAccess(...STAFF), ctrl.listTechnicians);
router.get('/:workshopId/users', authenticate, workshopAccess(ADMIN), ctrl.listUsers);
router.post('/:workshopId/users', authenticate, workshopAccess(ADMIN), ctrl.createUser);
router.patch('/:workshopId/users/:userId', authenticate, workshopAccess(ADMIN), ctrl.updateUser);
router.put('/:workshopId/users/:userId/password', authenticate, workshopAccess(ADMIN), ctrl.resetUserPassword);
router.delete('/:workshopId/users/:userId', authenticate, workshopAccess(ADMIN), ctrl.removeUser);

module.exports = router;
