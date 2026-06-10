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

router.use('/auth', authRoutes);
router.use('/workshops', workshopRoutes);
router.use('/workshops/:workshopId/customers', customerRoutes);
router.use('/workshops/:workshopId/vehicles', vehicleRoutes);
router.use('/workshops/:workshopId/appointments', appointmentRoutes);
router.use('/workshops/:workshopId/work-orders', workorderRoutes);
router.use('/workshops/:workshopId/quotes', quoteRoutes);
router.use('/workshops/:workshopId', photosRoutes);
router.use('/workshops/:workshopId', inventoryRoutes);
router.use('/workshops/:workshopId/reports', reportRoutes);
router.use('/notifications', notifRoutes);

module.exports = router;
