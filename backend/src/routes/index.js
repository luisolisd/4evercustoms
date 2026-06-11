const router = require('express').Router();

const authRoutes         = require('../modules/auth/auth.routes');
const workshopRoutes     = require('../modules/workshops/workshops.routes');
const customerRoutes     = require('../modules/customers/customers.routes');
const vehicleRoutes      = require('../modules/vehicles/vehicles.routes');
const appointmentRoutes  = require('../modules/appointments/appointments.routes');
const workorderRoutes    = require('../modules/workorders/workorders.routes');
const quoteRoutes        = require('../modules/quotes/quotes.routes');
const photosRoutes       = require('../modules/photos/photos.routes');
const inventoryRoutes    = require('../modules/inventory/inventory.routes');
const notifRoutes        = require('../modules/notifications/notifications.routes');
const reportRoutes       = require('../modules/reports/reports.routes');
const customerSelfRoutes = require('../modules/customer/customer.routes');
const promotionRoutes    = require('../modules/promotions/promotions.routes');
const push               = require('../utils/push');

router.use('/auth', authRoutes);
router.use('/customer', customerSelfRoutes);
router.get('/push/vapid-public-key', (req, res) =>
  res.json({ success: true, data: { publicKey: push.getPublicKey() } })
);
router.use('/workshops', workshopRoutes);
router.use('/workshops/:workshopId/customers', customerRoutes);
router.use('/workshops/:workshopId/vehicles', vehicleRoutes);
router.use('/workshops/:workshopId/appointments', appointmentRoutes);
router.use('/workshops/:workshopId/work-orders', workorderRoutes);
router.use('/workshops/:workshopId/quotes', quoteRoutes);
router.use('/workshops/:workshopId', photosRoutes);
router.use('/workshops/:workshopId', inventoryRoutes);
router.use('/workshops/:workshopId/reports', reportRoutes);
router.use('/workshops/:workshopId/promotions', promotionRoutes);
router.use('/notifications', notifRoutes);

module.exports = router;
