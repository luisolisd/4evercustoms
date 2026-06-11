const router = require('express').Router();
const ctrl = require('./customer.controller');
const authenticate = require('../../middleware/authenticate');
const customerAccess = require('./customer.middleware');

// Todas las rutas requieren un usuario autenticado que sea cliente
router.use(authenticate, customerAccess);

router.get('/me', ctrl.me);
router.get('/vehicles', ctrl.vehicles);
router.get('/vehicles/:vehicleId', ctrl.vehicleDetail);
router.get('/work-orders/:orderId', ctrl.workOrderDetail);
router.get('/appointments', ctrl.appointments);
router.post('/appointments', ctrl.createAppointment);
router.patch('/appointments/:id/cancel', ctrl.cancelAppointment);
router.patch('/quotes/:id/respond', ctrl.respondQuote);
router.get('/notifications', ctrl.notifications);
router.patch('/notifications/:id/read', ctrl.markNotificationRead);
router.get('/promotions', ctrl.promotions);
router.post('/push/subscribe', ctrl.subscribePush);
router.post('/push/unsubscribe', ctrl.unsubscribePush);

module.exports = router;
