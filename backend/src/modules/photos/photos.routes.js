const router = require('express').Router({ mergeParams: true });
const ctrl = require('./photos.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { upload } = require('./photos.upload');

const auth = [authenticate, workshopAccess()];
const adminOrTech = [authenticate, workshopAccess('WORKSHOP_ADMIN', 'TECHNICIAN')];

router.get('/work-orders/:orderId/photos', ...auth, ctrl.list);
router.post('/work-orders/:orderId/photos', ...adminOrTech, upload.array('photos', 10), ctrl.upload);
router.delete('/photos/:photoId', ...adminOrTech, ctrl.remove);

module.exports = router;
