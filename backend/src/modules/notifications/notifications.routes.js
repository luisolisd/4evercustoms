const router = require('express').Router();
const ctrl = require('./notifications.controller');
const authenticate = require('../../middleware/authenticate');

router.get('/', authenticate, ctrl.list);
router.patch('/:notificationId/read', authenticate, ctrl.markRead);
router.patch('/read-all', authenticate, ctrl.markAllRead);
router.post('/push-token', authenticate, ctrl.updatePushToken);
router.post('/push/subscribe', authenticate, ctrl.subscribePush);
router.post('/push/unsubscribe', authenticate, ctrl.unsubscribePush);

module.exports = router;
