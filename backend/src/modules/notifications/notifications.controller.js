const prisma = require('../../config/database');
const { ok } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { userId: req.user.id };
    const [data, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    res.json({ success: true, data, unread, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const markRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.notificationId, userId: req.user.id },
      data: { isRead: true, readAt: new Date() },
    });
    ok(res, { message: 'Marcada como leída' });
  } catch (e) { next(e); }
};

const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    ok(res, { message: 'Todas marcadas como leídas' });
  } catch (e) { next(e); }
};

const updatePushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    await prisma.user.update({ where: { id: req.user.id }, data: { fcmToken: token } });
    ok(res, { message: 'Token actualizado' });
  } catch (e) { next(e); }
};

// Suscripción push del navegador de un usuario del taller (técnico, supervisor, admin)
const subscribePush = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ success: false, message: 'Suscripción inválida' });
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: req.user.id, customerId: null, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    ok(res, { message: 'Notificaciones activadas' });
  } catch (e) { next(e); }
};

const unsubscribePush = async (req, res, next) => {
  try {
    if (req.body.endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint, userId: req.user.id } });
    ok(res, { message: 'Notificaciones desactivadas' });
  } catch (e) { next(e); }
};

module.exports = { list, markRead, markAllRead, updatePushToken, subscribePush, unsubscribePush };
