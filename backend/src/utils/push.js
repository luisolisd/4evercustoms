const webpush = require('web-push');
const prisma = require('../config/database');
const logger = require('./logger');

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@4evrcustoms.mx';

let enabled = false;
if (PUBLIC && PRIVATE) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  enabled = true;
} else {
  logger.warn('[push] Faltan claves VAPID; las notificaciones push están deshabilitadas.');
}

const getPublicKey = () => (enabled ? PUBLIC : null);

// Envía a una suscripción; si está muerta (404/410) la elimina.
async function sendToSubscription(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      logger.warn('[push] Error enviando notificación: ' + e.message);
    }
  }
}

async function sendToCustomer(customerId, payload) {
  if (!enabled) return;
  const subs = await prisma.pushSubscription.findMany({ where: { customerId } });
  await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
}

async function sendToWorkshopCustomers(workshopId, payload) {
  if (!enabled) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { customer: { workshopId, isActive: true } },
  });
  await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
}

module.exports = { enabled, getPublicKey, sendToCustomer, sendToWorkshopCustomers };
