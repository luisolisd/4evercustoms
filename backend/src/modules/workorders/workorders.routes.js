const router = require('express').Router({ mergeParams: true });
const ctrl = require('./workorders.controller');
const authenticate = require('../../middleware/authenticate');
const { workshopAccess } = require('../../middleware/workshopAccess');
const { ADMIN, STAFF, ALL } = require('../../utils/roles');

const staff = [authenticate, workshopAccess(...STAFF)];
const adminOnly = [authenticate, workshopAccess(ADMIN)];
const anyRole = [authenticate, workshopAccess(...ALL)];

// El técnico solo ve/edita las órdenes que tiene asignadas (lo aplica el controlador)
router.get('/', ...anyRole, ctrl.list);
router.post('/', ...staff, ctrl.create);
router.get('/:orderId', ...anyRole, ctrl.getOne);
router.put('/:orderId', ...anyRole, ctrl.update);
router.patch('/:orderId/status', ...anyRole, ctrl.updateStatus);
router.patch('/:orderId/payment', ...staff, ctrl.updatePayment);
router.patch('/:orderId/link-quote', ...staff, ctrl.linkQuote);
router.post('/:orderId/reception-signature', ...staff, ctrl.signReception);
router.post('/:orderId/advisor-signature', ...staff, ctrl.signAdvisor);
router.delete('/:orderId/reception-signature', ...adminOnly, ctrl.clearReceptionSignature);
router.get('/:orderId/payments', ...staff, ctrl.listPayments);
router.post('/:orderId/payments', ...staff, ctrl.addPayment);
router.delete('/:orderId/payments/:paymentId', ...adminOnly, ctrl.removePayment);
router.post('/:orderId/parts', ...staff, ctrl.addPart);
router.delete('/:orderId/parts/:lineId', ...staff, ctrl.removePart);
router.delete('/:orderId', ...adminOnly, ctrl.remove);

module.exports = router;
