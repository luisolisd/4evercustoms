const prisma = require('../../config/database');
const { ok, created, notFound } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

const generateOrderNumber = async (workshopId) => {
  const count = await prisma.workOrder.count({ where: { workshopId } });
  return `WO-${String(count + 1).padStart(5, '0')}`;
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, customerId, vehicleId, from, to } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = {
      workshopId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(vehicleId && { vehicleId }),
      ...(from || to) && {
        receivedAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      },
    };

    const [data, total] = await Promise.all([
      prisma.workOrder.findMany({
        where, skip, take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
          _count: { select: { photos: true, quotes: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const orderNumber = await generateOrderNumber(workshopId);
    const order = await prisma.workOrder.create({
      data: { workshopId, orderNumber, ...req.body },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, make: true, model: true, year: true } },
      },
    });

    await prisma.serviceHistory.create({
      data: {
        workshopId,
        vehicleId: order.vehicleId,
        workOrderId: order.id,
        serviceDate: order.receivedAt,
        description: order.description || `Orden ${orderNumber} iniciada`,
        mileage: order.mileageIn,
      },
    });

    created(res, order);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.orderId, workshopId: req.params.workshopId },
      include: {
        customer: true,
        vehicle: true,
        quotes: { include: { items: true } },
        photos: true,
        workOrderParts: { include: { part: true } },
        serviceHistory: true,
      },
    });
    if (!order) return notFound(res);
    ok(res, order);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.orderId, workshopId: req.params.workshopId },
    });
    if (!order) return notFound(res);

    const allowed = ['description', 'diagnosis', 'technicianNotes', 'technicianId', 'estimatedReady', 'mileageIn', 'mileageOut'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const updated = await prisma.workOrder.update({ where: { id: order.id }, data });
    ok(res, updated);
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.orderId, workshopId: req.params.workshopId },
    });
    if (!order) return notFound(res);

    const data = { ...(status && { status }), ...(paymentStatus && { paymentStatus }) };
    if (status === 'DELIVERED') data.deliveredAt = new Date();

    const updated = await prisma.workOrder.update({ where: { id: order.id }, data });
    ok(res, updated);
  } catch (e) { next(e); }
};

const addPart = async (req, res, next) => {
  try {
    const { partId, quantity, unitPrice } = req.body;
    const part = await prisma.workOrderPart.create({
      data: {
        workOrderId: req.params.orderId,
        partId,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      },
      include: { part: true },
    });
    ok(res, part, 201);
  } catch (e) { next(e); }
};

const removePart = async (req, res, next) => {
  try {
    await prisma.workOrderPart.deleteMany({
      where: { workOrderId: req.params.orderId, partId: req.params.partId },
    });
    ok(res, { message: 'Refacción removida' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, updateStatus, addPart, removePart };
