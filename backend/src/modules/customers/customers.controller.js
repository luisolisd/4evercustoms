const prisma = require('../../config/database');
const { ok, created, notFound } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search;

    const where = {
      workshopId,
      isActive: true,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
        include: { _count: { select: { vehicles: true, workOrders: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const customer = await prisma.customer.create({
      data: { workshopId, ...req.body },
    });
    created(res, customer);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, workshopId: req.params.workshopId },
      include: {
        vehicles: { where: { isActive: true } },
        _count: { select: { workOrders: true, appointments: true } },
      },
    });
    if (!customer) return notFound(res);
    ok(res, customer);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, workshopId: req.params.workshopId },
    });
    if (!customer) return notFound(res);

    const allowed = ['firstName', 'lastName', 'phone', 'email', 'address', 'notes'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const updated = await prisma.customer.update({ where: { id: customer.id }, data });
    ok(res, updated);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.customer.updateMany({
      where: { id: req.params.customerId, workshopId: req.params.workshopId },
      data: { isActive: false },
    });
    ok(res, { message: 'Cliente desactivado' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, remove };
