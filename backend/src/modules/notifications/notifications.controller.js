const prisma = require('../../config/database');
const { ok } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { userId: req.user.id };
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
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

module.exports = { list, markRead, markAllRead, updatePushToken };
