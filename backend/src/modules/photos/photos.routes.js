const router = require('express').Router({ mergeParams: true });
const ctrl = require('./photos.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { STAFF, ALL } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];
const anyRole = [authenticate, workshopAccess(...ALL)];
const { upload } = require('./photos.upload');

// Fotos de una orden: el técnico solo en las que tiene asignadas (lo aplica el controlador)
router.get('/work-orders/:orderId/photos', ...anyRole, ctrl.list);
router.post('/work-orders/:orderId/photos', ...anyRole, upload.array('photos', 10), ctrl.upload);

// Requerimientos de fotos por orden (supervisor/admin)
router.post('/work-orders/:orderId/photo-slots', ...staff, ctrl.addSlots);
router.delete('/photo-slots/:slotId', ...staff, ctrl.removeSlot);

// Catálogo de fotos del taller
router.get('/photo-templates', ...staff, ctrl.listTemplates);
router.post('/photo-templates', ...staff, ctrl.createTemplate);
router.patch('/photo-templates/:templateId', ...staff, ctrl.updateTemplate);
router.delete('/photo-templates/:templateId', ...staff, ctrl.removeTemplate);

// Galería del servidor: ver, borrar una o en lote
router.get('/photos', ...staff, ctrl.gallery);
router.post('/photos/bulk-delete', ...staff, ctrl.bulkRemove);
router.delete('/photos/:photoId', ...staff, ctrl.remove);

module.exports = router;
