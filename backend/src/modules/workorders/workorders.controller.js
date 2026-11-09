const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { notifyCustomer } = require('../../utils/notify');
const { recalcOrderTotal, recalcPaid } = require('../../utils/orderTotals');
const { addSlotsToOrder } = require('../../utils/photoSlots');
const { TECHNICIAN } = require('../../utils/roles');
const { destroyCloudPhotos } = require('../photos/photos.upload');
const { CUSTOMER_PUBLIC, z, pick, ensure, dateStr, num, optionalInt, optionalStr, httpError } = require('../../utils/guards');

const STATUSES = ['RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'];
const PAY_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'];
// Estatus que un técnico puede poner en sus órdenes (entrega y cancelación son de supervisor/admin)
const TECH_STATUSES = ['DIAGNOSIS', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

const STATUS_LABELS = {
  RECEIVED: 'Recibido',
  DIAGNOSIS: 'En diagnóstico',
  AWAITING_AUTH: 'Esperando tu autorización',
  IN_REPAIR: 'En reparación',
  FINAL_TESTING: 'En pruebas finales',
  READY_FOR_PICKUP: 'Listo para entrega',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const isTech = (req) => req.workshopUser?.role === TECHNICIAN;

const orderSchema = z.object({
  description: optionalStr,
  diagnosis: optionalStr,
  recommendations: optionalStr,
  technicianNotes: optionalStr,
  estimatedReady: z.preprocess((v) => (v === '' || v === null ? undefined : v), dateStr.optional()),
  mileageIn: optionalInt,
  mileageOut: optionalInt,
});

const parseDate = (v, name) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError('Fecha inválida: ' + name, 400);
  return d;
};

// El técnico asignado debe ser un TECHNICIAN activo del mismo taller
const ensureTechnician = async (userId, workshopId) => {
  const wu = userId && (await prisma.workshopUser.findFirst({
    where: { userId, workshopId, role: TECHNICIAN, isActive: true, user: { isActive: true } },
    select: { id: true },
  }));
  if (!wu) throw httpError('El técnico seleccionado no es válido', 400);
};

// Carga la orden verificando taller y, para técnicos, que esté asignada a ellos
const loadOrder = async (req, extra = {}) => {
  const order = await prisma.workOrder.findFirst({
    where: {
      id: req.params.orderId,
      workshopId: req.params.workshopId,
      ...(isTech(req) && { technicianId: req.user.id }),
    },
    ...extra,
  });
  return order;
};

// Usa el último número real + 1 (no el conteo) para no chocar tras borrar órdenes.
const generateOrderNumber = async (workshopId) => {
  const last = await prisma.workOrder.findFirst({
    where: { workshopId },
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });
  const n = last ? (parseInt(String(last.orderNumber).replace(/\D/g, ''), 10) || 0) : 0;
  return `O-${String(n + 1).padStart(4, '0')}`;
};

const TECH_USER = { select: { id: true, firstName: true, lastName: true } };

// Vista reducida para el técnico: sin dinero, cotizaciones ni datos de contacto
const forTechnician = (o) => {
  const {
    totalAmount, paidAmount, paymentStatus, paidAt, customerSignature, signedAt, quotes, payments, workOrderParts, ...rest
  } = o;
  void totalAmount; void paidAmount; void paymentStatus; void paidAt; void customerSignature; void signedAt;
  void quotes; void payments; void workOrderParts;
  return rest;
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, customerId, vehicleId, from, to, search, technicianId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    if (status && !STATUSES.includes(status)) return error(res, 'Estado inválido');
    const tech = isTech(req);

    const where = {
      workshopId,
      ...(tech && { technicianId: req.user.id }),
      ...(!tech && technicianId && { technicianId }),
      ...(status && { status }),
      ...(customerId && !tech && { customerId }),
      ...(vehicleId && { vehicleId }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ] } },
          { vehicle: { OR: [
            { licensePlate: { contains: search, mode: 'insensitive' } },
            { make: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
          ] } },
        ],
      }),
      ...(from || to) && {
        receivedAt: {
          ...(from && { gte: parseDate(from, 'from') }),
          ...(to && { lte: parseDate(to, 'to') }),
        },
      },
    };

    const [rows, total] = await Promise.all([
      prisma.workOrder.findMany({
        where, skip, take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          customer: { select: tech ? { id: true, firstName: true, lastName: true } : { id: true, firstName: true, lastName: true, phone: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
          technician: TECH_USER,
          photoSlots: { select: { id: true, _count: { select: { photos: true } } } },
          _count: { select: { photos: true, quotes: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    // Avance de fotos requeridas: cuántas ya tienen al menos una foto
    const data = rows.map((o) => {
      const slots = o.photoSlots || [];
      const { photoSlots, ...rest } = o;
      void photoSlots;
      const shaped = { ...rest, slotProgress: { total: slots.length, done: slots.filter((s) => s._count.photos > 0).length } };
      return tech ? forTechnician(shaped) : shaped;
    });

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    await ensure.customer(req.body.customerId, workshopId);
    await ensure.vehicle(req.body.vehicleId, workshopId, req.body.customerId);
    const data = orderSchema.parse(
      pick(req.body, ['description', 'diagnosis', 'recommendations', 'technicianNotes', 'estimatedReady', 'mileageIn'])
    );
    const technicianId = req.body.technicianId || null;
    if (technicianId) await ensureTechnician(technicianId, workshopId);
    // Valida las fotos requeridas antes de crear la orden
    const slotSpec = {
      templateIds: Array.isArray(req.body.photoTemplateIds) ? req.body.photoTemplateIds : [],
      custom: Array.isArray(req.body.photoCustom) ? req.body.photoCustom : [],
    };

    // El número se calcula como último+1; si dos órdenes chocan (unique), se reintenta.
    let order;
    for (let attempt = 0; attempt < 4; attempt++) {
      const orderNumber = await generateOrderNumber(workshopId);
      try {
        order = await prisma.workOrder.create({
          data: {
            workshopId, orderNumber, customerId: req.body.customerId, vehicleId: req.body.vehicleId,
            ...(technicianId && { technicianId }), ...data,
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
            vehicle: { select: { id: true, make: true, model: true, year: true } },
            technician: TECH_USER,
          },
        });
        break;
      } catch (e) {
        if (e.code !== 'P2002' || attempt === 3) throw e;
      }
    }

    await prisma.serviceHistory.create({
      data: {
        workshopId,
        vehicleId: order.vehicleId,
        workOrderId: order.id,
        serviceDate: order.receivedAt,
        description: order.description || `Orden ${order.orderNumber} iniciada`,
        mileage: order.mileageIn,
      },
    });
    await addSlotsToOrder(workshopId, order.id, slotSpec);

    created(res, order);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const tech = isTech(req);
    const order = await loadOrder(req, {
      include: {
        customer: { select: tech ? { id: true, firstName: true, lastName: true } : CUSTOMER_PUBLIC },
        vehicle: true,
        technician: TECH_USER,
        quotes: { include: { items: true } },
        photos: { orderBy: { takenAt: 'desc' } },
        photoSlots: { orderBy: { createdAt: 'asc' }, include: { photos: { orderBy: { takenAt: 'desc' } } } },
        workOrderParts: { include: { part: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        serviceHistory: true,
      },
    });
    if (!order) return notFound(res);
    ok(res, tech ? forTechnician(order) : order);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const order = await loadOrder(req, { select: { id: true, workshopId: true } });
    if (!order) return notFound(res);

    // El técnico solo escribe diagnóstico, recomendaciones y sus notas
    const fields = isTech(req)
      ? ['diagnosis', 'recommendations', 'technicianNotes']
      : ['description', 'diagnosis', 'recommendations', 'technicianNotes', 'estimatedReady', 'mileageIn', 'mileageOut'];
    const data = orderSchema.partial().parse(pick(req.body, fields));

    if (!isTech(req) && 'technicianId' in req.body) {
      const tid = req.body.technicianId || null;
      if (tid) await ensureTechnician(tid, order.workshopId);
      data.technicianId = tid;
    }
    const updated = await prisma.workOrder.update({ where: { id: order.id }, data });
    ok(res, isTech(req) ? forTechnician(updated) : updated);
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;
    if (status && !STATUSES.includes(status)) return error(res, 'Estado inválido');
    if (paymentStatus && !PAY_STATUSES.includes(paymentStatus)) return error(res, 'Estado de pago inválido');
    const tech = isTech(req);
    if (tech && (paymentStatus || (status && !TECH_STATUSES.includes(status)))) {
      return error(res, 'No tienes permiso para este cambio de estatus', 403);
    }
    const order = await loadOrder(req);
    if (!order) return notFound(res);

    const data = { ...(status && { status }), ...(paymentStatus && { paymentStatus }) };
    if (status === 'DELIVERED') data.deliveredAt = new Date();
    else if (status && order.status === 'DELIVERED') data.deliveredAt = null;
    if (paymentStatus) data.paidAt = paymentStatus === 'PAID' ? order.paidAt || new Date() : null;

    const updated = await prisma.workOrder.update({ where: { id: order.id }, data });

    // Notifica al cliente cuando cambia el estatus de su vehículo
    if (status && status !== order.status) {
      notifyCustomer(
        { customerId: order.customerId, workshopId: order.workshopId },
        {
          type: 'STATUS_UPDATE',
          title: `Tu vehículo: ${STATUS_LABELS[status] || status}`,
          body: `La orden #${order.orderNumber} cambió a "${STATUS_LABELS[status] || status}".`,
          url: `/cliente/orden/${order.id}`,
        }
      ).catch(() => {});
    }

    ok(res, tech ? forTechnician(updated) : updated);
  } catch (e) { next(e); }
};

// Corrige manualmente el total a cobrar. Lo pagado sale del historial de pagos.
const updatePayment = async (req, res, next) => {
  try {
    const order = await loadOrder(req, { select: { id: true } });
    if (!order) return notFound(res);
    const { totalAmount } = z.object({ totalAmount: num.min(0) }).parse(req.body);
    await prisma.workOrder.update({ where: { id: order.id }, data: { totalAmount } });
    ok(res, await recalcPaid(order.id));
  } catch (e) { next(e); }
};

const paymentSchema = z.object({
  amount: num.positive('El monto debe ser mayor a 0').max(10_000_000),
  method: z.enum(PAYMENT_METHODS).default('CASH'),
  note: optionalStr,
});

const listPayments = async (req, res, next) => {
  try {
    await ensure.workOrder(req.params.orderId, req.params.workshopId);
    ok(res, await prisma.payment.findMany({ where: { workOrderId: req.params.orderId }, orderBy: { createdAt: 'desc' } }));
  } catch (e) { next(e); }
};

// Registra un pago (cobro). Lo pagado y el estatus de pago se derivan del historial.
const addPayment = async (req, res, next) => {
  try {
    const { orderId, workshopId } = req.params;
    const order = await prisma.workOrder.findFirst({
      where: { id: orderId, workshopId },
      select: { id: true, orderNumber: true, customerId: true, workshopId: true },
    });
    if (!order) return notFound(res);
    const body = paymentSchema.parse(req.body);

    const payment = await prisma.payment.create({
      data: { workshopId, workOrderId: orderId, amount: body.amount, method: body.method, note: body.note, receivedById: req.user.id },
    });
    const updated = await recalcPaid(orderId);

    const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
    const titles = { PAID: '✅ Pago completado', PARTIAL: 'Pago parcial registrado', PENDING: 'Pago registrado' };
    notifyCustomer(
      { customerId: order.customerId, workshopId: order.workshopId },
      {
        type: 'CUSTOM',
        title: titles[updated.paymentStatus] || 'Pago registrado',
        body: `Orden #${order.orderNumber}: pagado ${money(Number(updated.paidAmount))} de ${money(Number(updated.totalAmount))}.`,
        url: `/cliente/orden/${order.id}`,
      }
    ).catch(() => {});

    created(res, { payment, order: updated });
  } catch (e) { next(e); }
};

// Solo administrador: corrige un pago capturado por error
const removePayment = async (req, res, next) => {
  try {
    const { orderId, workshopId, paymentId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    const del = await prisma.payment.deleteMany({ where: { id: paymentId, workOrderId: orderId, workshopId } });
    if (del.count === 0) return notFound(res, 'Pago no encontrado');
    ok(res, { message: 'Pago eliminado', order: await recalcPaid(orderId) });
  } catch (e) { next(e); }
};

// Vincula una cotización existente (sin orden) a esta orden de trabajo.
const linkQuote = async (req, res, next) => {
  try {
    const { quoteId } = req.body;
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.orderId, workshopId: req.params.workshopId },
      select: { id: true, customerId: true },
    });
    if (!order) return notFound(res);
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, workshopId: req.params.workshopId },
      select: { id: true, customerId: true, workOrderId: true },
    });
    if (!quote) return notFound(res, 'Cotización no encontrada');
    if (quote.workOrderId) return error(res, 'Esa cotización ya está ligada a una orden', 400);
    if (quote.customerId !== order.customerId) {
      return error(res, 'La cotización es de otro cliente', 400);
    }
    await prisma.quote.update({ where: { id: quote.id }, data: { workOrderId: order.id } });
    await recalcOrderTotal(order.id); // por si la cotización ya está aprobada
    ok(res, { message: 'Cotización vinculada' });
  } catch (e) { next(e); }
};

const partSchema = z.object({
  partId: z.string().min(1),
  quantity: num.positive('La cantidad debe ser mayor a 0'),
  unitPrice: num.min(0).optional(),
});

const addPart = async (req, res, next) => {
  try {
    const { orderId, workshopId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    const body = partSchema.parse(req.body);
    const part = await ensure.part(body.partId, workshopId);
    const unitPrice = body.unitPrice ?? Number(part.unitPrice);

    const row = await prisma.workOrderPart.create({
      data: {
        workOrderId: orderId,
        partId: body.partId,
        quantity: body.quantity,
        unitPrice,
        total: Math.round(body.quantity * unitPrice * 100) / 100,
      },
      include: { part: true },
    });
    await recalcOrderTotal(orderId);
    ok(res, row, 201);
  } catch (e) { next(e); }
};

const removePart = async (req, res, next) => {
  try {
    const { orderId, workshopId, partId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    await prisma.workOrderPart.deleteMany({ where: { workOrderId: orderId, partId } });
    await recalcOrderTotal(orderId);
    ok(res, { message: 'Refacción removida' });
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.orderId, workshopId: req.params.workshopId },
      select: { id: true },
    });
    if (!order) return notFound(res);
    // Los pagos alimentan el corte de caja: no se pierden al borrar una orden
    if ((await prisma.payment.count({ where: { workOrderId: order.id } })) > 0) {
      return error(res, 'La orden tiene pagos registrados. Elimina los pagos primero (queda constancia en el corte).', 409);
    }
    const photos = await prisma.photo.findMany({ where: { workOrderId: order.id }, select: { publicId: true, url: true } });
    await destroyCloudPhotos(photos);
    await prisma.$transaction([
      prisma.serviceHistory.deleteMany({ where: { workOrderId: order.id } }),
      prisma.photo.deleteMany({ where: { workOrderId: order.id } }),
      prisma.workOrderPart.deleteMany({ where: { workOrderId: order.id } }),
      prisma.quote.deleteMany({ where: { workOrderId: order.id } }),
      prisma.workOrder.delete({ where: { id: order.id } }),
    ]);
    ok(res, { message: 'Orden eliminada' });
  } catch (e) { next(e); }
};

module.exports = {
  list, create, getOne, update, updateStatus, updatePayment, linkQuote,
  listPayments, addPayment, removePayment, addPart, removePart, remove,
};
