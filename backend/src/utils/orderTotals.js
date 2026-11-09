const prisma = require('../config/database');

// Deriva estatus de pago y fecha de pago a partir de total/pagado.
// paidAt = momento en que la orden quedó liquidada (base de los reportes de ingresos).
function derivePayment(total, paid, prevPaidAt = null) {
  let paymentStatus = 'PENDING';
  if (total > 0 && paid >= total) paymentStatus = 'PAID';
  else if (paid > 0) paymentStatus = 'PARTIAL';
  const paidAt = paymentStatus === 'PAID' ? prevPaidAt || new Date() : null;
  return { paymentStatus, paidAt };
}

// Recalcula el total de una orden = refacciones + cotizaciones aprobadas.
// Reajusta el estatus de pago según lo ya pagado. (El admin puede sobrescribir
// el total manualmente desde "Registrar pago" para correcciones.)
async function recalcOrderTotal(orderId) {
  const order = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { paidAmount: true, paidAt: true },
  });
  if (!order) return null;

  const [partsAgg, quotesAgg] = await Promise.all([
    prisma.workOrderPart.aggregate({ where: { workOrderId: orderId }, _sum: { total: true } }),
    prisma.quote.aggregate({ where: { workOrderId: orderId, status: 'APPROVED' }, _sum: { total: true } }),
  ]);

  // Refacciones y cotizaciones: el precio capturado ya incluye IVA.
  const total = Number(partsAgg._sum.total || 0) + Number(quotesAgg._sum.total || 0);
  const { paymentStatus, paidAt } = derivePayment(total, Number(order.paidAmount), order.paidAt);

  return prisma.workOrder.update({
    where: { id: orderId },
    data: { totalAmount: total, paymentStatus, paidAt },
  });
}

// Recalcula lo pagado a partir del historial de pagos y deriva el estatus de pago.
async function recalcPaid(orderId) {
  const order = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { totalAmount: true, paidAt: true },
  });
  if (!order) return null;
  const agg = await prisma.payment.aggregate({ where: { workOrderId: orderId }, _sum: { amount: true } });
  const paid = Math.max(0, Number(agg._sum.amount || 0));
  const { paymentStatus, paidAt } = derivePayment(Number(order.totalAmount), paid, order.paidAt);
  return prisma.workOrder.update({
    where: { id: orderId },
    data: { paidAmount: paid, paymentStatus, paidAt },
  });
}

module.exports = { recalcOrderTotal, recalcPaid, derivePayment };
