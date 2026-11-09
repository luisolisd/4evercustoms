const prisma = require('../../config/database');
const { ok, created, notFound } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { z, pick, ensure, optionalInt, optionalStr } = require('../../utils/guards');

const FIELDS = ['make', 'model', 'year', 'vin', 'licensePlate', 'color', 'engineType', 'mileage', 'notes'];
const vehicleSchema = z.object({
  make: z.string().trim().min(1, 'Requerido'),
  model: z.string().trim().min(1, 'Requerido'),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  vin: optionalStr,
  licensePlate: optionalStr,
  color: optionalStr,
  engineType: optionalStr,
  mileage: optionalInt,
  notes: optionalStr,
});

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { customerId, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query, 500);

    const where = {
      workshopId,
      isActive: true,
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { licensePlate: { contains: search, mode: 'insensitive' } },
          { vin: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      }),
      prisma.vehicle.count({ where }),
    ]);

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    await ensure.customer(req.body.customerId, workshopId);
    const data = vehicleSchema.parse(pick(req.body, FIELDS));
    const vehicle = await prisma.vehicle.create({
      data: { workshopId, customerId: req.body.customerId, ...data },
    });
    created(res, vehicle);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.vehicleId, workshopId: req.params.workshopId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { workOrders: true } },
      },
    });
    if (!vehicle) return notFound(res);
    ok(res, vehicle);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.vehicleId, workshopId: req.params.workshopId },
    });
    if (!vehicle) return notFound(res);

    const data = vehicleSchema.partial().parse(pick(req.body, FIELDS));
    const updated = await prisma.vehicle.update({ where: { id: vehicle.id }, data });
    ok(res, updated);
  } catch (e) { next(e); }
};

const getHistory = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 500);
    const where = { vehicleId: req.params.vehicleId, workshopId: req.params.workshopId };
    const [data, total] = await Promise.all([
      prisma.serviceHistory.findMany({
        where, skip, take: limit,
        orderBy: { serviceDate: 'desc' },
        include: { workOrder: { select: { orderNumber: true, status: true } } },
      }),
      prisma.serviceHistory.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.vehicle.updateMany({
      where: { id: req.params.vehicleId, workshopId: req.params.workshopId },
      data: { isActive: false },
    });
    ok(res, { message: 'Vehículo eliminado' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, getHistory, remove };

