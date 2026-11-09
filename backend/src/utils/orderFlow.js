const prisma = require('../config/database');
const { notifyCustomer } = require('./notify');

// Flujo de una orden. Lo automático solo recorre hasta "Pruebas finales";
// "Listo para entrega" y "Entregado" los confirma una persona.
const FLOW = ['RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP', 'DELIVERED'];
const idx = (s) => FLOW.indexOf(s);

const LABELS = {
  DIAGNOSIS: 'En diagnóstico',
  AWAITING_AUTH: 'Esperando tu autorización',
  IN_REPAIR: 'En reparación',
  FINAL_TESTING: 'En pruebas finales',
};

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

// Hechos registrados en la orden y el estatus que implican
async function getFacts(orderId) {
  const [order, slots, quotes, techs] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, diagnosis: true, technicianNotes: true, customerId: true, workshopId: true, orderNumber: true },
    }),
    prisma.orderPhotoSlot.findMany({ where: { workOrderId: orderId }, select: { kind: true, _count: { select: { photos: true } } } }),
    prisma.quote.findMany({ where: { workOrderId: orderId }, select: { status: true } }),
    prisma.workOrderTechnician.count({ where: { workOrderId: orderId } }),
  ]);
  if (!order) return null;

  const rec = slots.filter((s) => s.kind === 'RECEPTION');
  const tech = slots.filter((s) => s.kind === 'TECH');
  const recDone = rec.filter((s) => s._count.photos > 0).length;
  const techDone = tech.filter((s) => s._count.photos > 0).length;

  const pendingQuote = quotes.some((q) => q.status === 'SENT') && !quotes.some((q) => q.status === 'APPROVED');
  const approved = quotes.some((q) => q.status === 'APPROVED');
  const started = filled(order.diagnosis) || filled(order.technicianNotes) || techDone > 0;
  const allTechDone = tech.length > 0 && techDone === tech.length;

  // Estatus implícito (el mayor que justifican los hechos)
  let target = 'RECEIVED';
  if (started) target = 'DIAGNOSIS';
  if (pendingQuote) target = 'AWAITING_AUTH';
  else if (approved) target = 'IN_REPAIR';
  if (!pendingQuote && allTechDone && (approved || started)) target = 'FINAL_TESTING';

  return {
    order,
    target,
    facts: {
      reception: { total: rec.length, done: recDone },
      tech: { total: tech.length, done: techDone },
      technicians: techs,
      started,
      quote: pendingQuote ? 'PENDING' : approved ? 'APPROVED' : quotes.length ? 'OTHER' : 'NONE',
    },
  };
}

// Avanza el estatus (nunca retrocede ni toca READY/DELIVERED/CANCELLED) y avisa al cliente.
// Se llama tras cada acción: foto, nota, cotización enviada/aprobada.
async function autoAdvance(orderId) {
  if (!orderId) return null;
  const f = await getFacts(orderId);
  if (!f) return null;
  const { order, target } = f;
  if (idx(order.status) < 0 || idx(order.status) >= idx('READY_FOR_PICKUP')) return null;
  if (idx(target) <= idx(order.status)) return null;

  const moved = await prisma.workOrder.updateMany({
    where: { id: orderId, status: order.status }, // condición: evita pisar un cambio simultáneo
    data: { status: target },
  });
  if (moved.count === 0) return null;

  // La cotización por aprobar ya se avisa por separado; no se duplica el mensaje
  if (target !== 'AWAITING_AUTH') {
    notifyCustomer(
      { customerId: order.customerId, workshopId: order.workshopId },
      {
        type: 'STATUS_UPDATE',
        title: `Tu vehículo: ${LABELS[target] || target}`,
        body: `La orden #${order.orderNumber} cambió a "${LABELS[target] || target}".`,
        url: `/cliente/orden/${orderId}`,
      }
    ).catch(() => {});
  }
  return target;
}

// Versión segura para disparar sin esperar ni romper la petición principal
const autoAdvanceSafe = (orderId) => autoAdvance(orderId).catch(() => null);

module.exports = { FLOW, getFacts, autoAdvance, autoAdvanceSafe };
