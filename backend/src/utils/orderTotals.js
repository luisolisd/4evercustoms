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

  // Refacciones: el precio capturado es SIN IVA → se le agrega 16% al total.
  // Cotizaciones: el precio ya incluye IVA.
  const partsTotal = Number(partsAgg._sum.total || 0) * 1.16;
  const quotesTotal = Number(quotesAgg._sum.total || 0);
  const total = Math.round((partsTotal + quotesTotal) * 100) / 100;
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
