const prisma = require('../config/database');
const push = require('./push');

/**
 * Crea una notificación en BD y la envía por push al cliente.
 * @param {{customerId: string, workshopId: string}} target
 */
async function notifyCustomer(target, { type = 'CUSTOM', title, body, url = '/cliente/avisos', data }) {
  await prisma.notification
    .create({
      data: {
        workshopId: target.workshopId,
        customerId: target.customerId,
        type,
        title,
        body,
        sentAt: new Date(),
      },
    })
    .catch(() => {});
  await push.sendToCustomer(target.customerId, { title, body, data: { url, ...(data || {}) } });
}

// Aviso para un usuario del taller: se guarda en su bandeja y se envía por push.
// orderUrl: ruta según el rol (el técnico ve /mis-ordenes; admin y supervisor, /work-orders)
async function notifyUser({ userId, workshopId, title, body, url = '/', type = 'ASSIGNMENT', data }) {
  await prisma.notification
    .create({ data: { workshopId, userId, type, title, body, data: { url, ...(data || {}) }, sentAt: new Date() } })
    .catch(() => {});
  await push.sendToUser(userId, { title, body, data: { url, ...(data || {}) } }).catch(() => {});
}

// Ruta de una orden según el rol del destinatario
async function orderUrlFor(workshopId, userId, orderId) {
  const wu = await prisma.workshopUser.findFirst({ where: { workshopId, userId }, select: { role: true } });
  return wu?.role === 'TECHNICIAN' ? `/mis-ordenes/${orderId}` : `/work-orders/${orderId}`;
}

module.exports = { notifyCustomer, notifyUser, orderUrlFor };
