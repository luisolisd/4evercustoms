const prisma = require('../config/database');

// Recalcula el total de una orden = refacciones + cotizaciones aprobadas.
// Reajusta el estatus de pago según lo ya pagado. (El admin puede sobrescribir
// el total manualmente desde "Registrar pago" para correcciones.)
async function recalcOrderTotal(orderId) {
  const order = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { paidAmount: true },
  });
  if (!order) return null;

  const [partsAgg, quotesAgg] = await Promise.all([
    prisma.workOrderPart.aggregate({ where: { workOrderId: orderId }, _sum: { total: true } }),
    prisma.quote.aggregate({ where: { workOrderId: orderId, status: 'APPROVED' }, _sum: { total: true } }),
  ]);

  const total = Number(partsAgg._sum.total || 0) + Number(quotesAgg._sum.total || 0);
  const paid = Number(order.paidAmount);

  let paymentStatus = 'PENDING';
  if (total > 0 && paid >= total) paymentStatus = 'PAID';
  else if (paid > 0) paymentStatus = 'PARTIAL';

  return prisma.workOrder.update({
    where: { id: orderId },
    data: { totalAmount: total, paymentStatus },
  });
}

module.exports = { recalcOrderTotal };
