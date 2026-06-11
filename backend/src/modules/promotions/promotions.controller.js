const prisma = require('../../config/database');
const { ok, created, error, notFound } = require('../../utils/response');
const push = require('../../utils/push');

const list = async (req, res, next) => {
  try {
    const promos = await prisma.promotion.findMany({
      where: { workshopId: req.params.workshopId },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, promos);
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { title, body, imageUrl } = req.body;
    if (!title || !body) return error(res, 'Título y descripción son requeridos');

    const promo = await prisma.promotion.create({
      data: { workshopId: req.params.workshopId, title, body, imageUrl: imageUrl || null },
    });

    // Notifica a todos los clientes del taller: registro en BD + push
    const customers = await prisma.customer.findMany({
      where: { workshopId: req.params.workshopId, isActive: true },
      select: { id: true },
    });
    if (customers.length) {
      await prisma.notification.createMany({
        data: customers.map((c) => ({
          workshopId: req.params.workshopId,
          customerId: c.id,
          type: 'CUSTOM',
          title: `🎉 ${title}`,
          body,
          sentAt: new Date(),
        })),
      });
    }
    push
      .sendToWorkshopCustomers(req.params.workshopId, {
        title: `🎉 ${title}`,
        body,
        data: { url: '/cliente/promociones' },
      })
      .catch(() => {});

    created(res, promo);
  } catch (e) { next(e); }
};

const toggle = async (req, res, next) => {
  try {
    const promo = await prisma.promotion.findFirst({
      where: { id: req.params.id, workshopId: req.params.workshopId },
    });
    if (!promo) return notFound(res);
    const updated = await prisma.promotion.update({
      where: { id: promo.id },
      data: { isActive: !promo.isActive },
    });
    ok(res, updated);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.promotion.deleteMany({
      where: { id: req.params.id, workshopId: req.params.workshopId },
    });
    ok(res, { message: 'Promoción eliminada' });
  } catch (e) { next(e); }
};

module.exports = { list, create, toggle, remove };
