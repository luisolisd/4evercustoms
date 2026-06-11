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

module.exports = { notifyCustomer };
