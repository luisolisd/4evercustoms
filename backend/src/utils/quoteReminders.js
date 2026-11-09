const prisma = require('../config/database');

const OPEN = ['PENDING', 'CONTACTED', 'CONFIRMED'];
const DAY = 24 * 60 * 60 * 1000;
const FOLLOW_UP_DAYS = 2; // días para dar seguimiento a una cotización enviada sin respuesta

// Mantiene sincronizado el recordatorio de una cotización con su estado:
//  · SENT (enviada, sin respuesta)  → debe existir un recordatorio abierto para confirmar o cancelar
//  · cualquier otro estado          → el recordatorio abierto se cierra (aprobada = realizado; resto = cancelado)
async function syncQuoteReminder(quoteId) {
  const q = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, workshopId: true, customerId: true, workOrderId: true, quoteNumber: true, status: true, validUntil: true },
  });
  if (!q) return;

  if (q.status === 'SENT') {
    const open = await prisma.serviceReminder.findFirst({ where: { quoteId, status: { in: OPEN } }, select: { id: true } });
    if (open) return;
    const now = Date.now();
    const followUp = now + FOLLOW_UP_DAYS * DAY;
    // Si la cotización vence antes, el seguimiento se adelanta a esa fecha
    const due = q.validUntil && q.validUntil.getTime() > now ? Math.min(q.validUntil.getTime(), followUp) : followUp;
    await prisma.serviceReminder.create({
      data: {
        workshopId: q.workshopId,
        customerId: q.customerId,
        workOrderId: q.workOrderId,
        quoteId: q.id,
        type: 'QUOTE',
        serviceType: `Confirmar cotización ${q.quoteNumber}`,
        dueDate: new Date(due),
      },
    });
    return;
  }

  await prisma.serviceReminder.updateMany({
    where: { quoteId, status: { in: OPEN } },
    data: { status: q.status === 'APPROVED' ? 'DONE' : 'CANCELLED' },
  });
}

module.exports = { syncQuoteReminder };
