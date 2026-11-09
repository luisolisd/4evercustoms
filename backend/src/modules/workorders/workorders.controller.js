const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { notifyCustomer, notifyUser, orderUrlFor } = require('../../utils/notify');
const { recalcOrderTotal, recalcPaid } = require('../../utils/orderTotals');
const { RECEPTION_SLOTS } = require('../../utils/photoSlots');
const { TECHNICIAN, ADMIN } = require('../../utils/roles');
const { destroyCloudPhotos } = require('../photos/photos.upload');
const { getFacts, autoAdvanceSafe } = require('../../utils/orderFlow');
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
  fuelLevel: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.enum(['E', '1/4', '1/2', '3/4', 'F']).optional()),
  belongings: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().max(500).optional()),
  receptionNotes: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().max(1500).optional()),
});

// Datos de recepción: quedan bloqueados cuando el cliente firma la conformidad
const RECEPTION_FIELDS = ['mileageIn', 'fuelLevel', 'belongings', 'receptionNotes'];

const parseDate = (v, name) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError('Fecha inválida: ' + name, 400);
  return d;
};

// Los asignados deben ser técnicos o el administrador (trabajos especiales), activos y del mismo taller
const ensureTechnicians = async (ids, workshopId) => {
  if (!Array.isArray(ids)) throw httpError('Lista de técnicos inválida', 400);
  const unique = [...new Set(ids.map(String))];
  if (!unique.length) return unique;
  const found = await prisma.workshopUser.count({
    where: { userId: { in: unique }, workshopId, role: { in: [TECHNICIAN, ADMIN] }, isActive: true, user: { isActive: true } },
  });
  if (found !== unique.length) throw httpError('Alguna persona seleccionada no es válida para asignar', 400);
  return unique;
};

// Carga la orden verificando taller y, para técnicos, que esté asignada a ellos
const loadOrder = async (req, extra = {}) => {
  const order = await prisma.workOrder.findFirst({
    where: {
      id: req.params.orderId,
      workshopId: req.params.workshopId,
      ...(isTech(req) && { technicians: { some: { userId: req.user.id } } }),
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

const TECHS_INCLUDE = { include: { user: { select: { id: true, firstName: true, lastName: true } } } };

// technicians: [{ id, firstName, lastName }]
const shapeTechs = (o) => (o.technicians ? { ...o, technicians: o.technicians.map((t) => t.user) } : o);

// Vista reducida para el técnico: sin dinero, cotizaciones ni datos de contacto
const forTechnician = (o) => {
  const {
    totalAmount, paidAmount, paymentStatus, paidAt, customerSignature, signedAt, receptionSignature, quotes, payments, workOrderParts, ...rest
  } = o;
  void totalAmount; void paidAmount; void paymentStatus; void paidAt; void customerSignature; void signedAt;
  void quotes; void payments; void workOrderParts; void receptionSignature;
  if (rest.photoSlots) rest.photoSlots = rest.photoSlots.filter((s) => s.kind === 'TECH');
  return rest;
};

// Resumen del avance automático para mostrar en la orden (sin dinero)
const getFlowView = async (orderId) => {
  const f = await getFacts(orderId);
  return f ? { facts: f.facts, suggested: f.target } : null;
};

// Avisa (en la app y por push) a quien recibe o pierde una orden. No se avisa a quien hace el cambio.
const notifyAssignment = async ({ actorId, workshopId, orderId, before, after }) => {
  const added = after.filter((id) => !before.includes(id) && id !== actorId);
  const removed = before.filter((id) => !after.includes(id) && id !== actorId);
  if (!added.length && !removed.length) return;
  const o = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, description: true, vehicle: { select: { make: true, model: true, year: true, licensePlate: true } } },
  });
  const car = o?.vehicle ? `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model}${o.vehicle.licensePlate ? ` (${o.vehicle.licensePlate})` : ''}` : '';
  const brief = o?.description ? ` · ${o.description.slice(0, 80)}` : '';
  await Promise.all([
    ...added.map(async (userId) => notifyUser({
      userId, workshopId, title: 'Nueva orden asignada', body: `${o.orderNumber} · ${car}${brief}`,
      url: await orderUrlFor(workshopId, userId, orderId), data: { orderId },
    })),
    ...removed.map(async (userId) => notifyUser({
      userId, workshopId, title: 'Orden reasignada', body: `Ya no tienes asignada la orden ${o.orderNumber} (${car}).`,
      url: '/', data: { orderId }, // Inicio lleva a cada rol a su pantalla
    })),
  ]);
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
      ...(tech && { technicians: { some: { userId: req.user.id } } }),
      ...(!tech && technicianId && { technicians: { some: { userId: technicianId } } }),
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
          technicians: TECHS_INCLUDE,
          photoSlots: { select: { id: true, kind: true, _count: { select: { photos: true } } } },
          _count: { select: { photos: true, quotes: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    // Avance de fotos requeridas: cuántas ya tienen al menos una foto
    const data = rows.map((o) => {
      const slots = (o.photoSlots || []).filter((s) => s.kind === 'TECH');
      const { photoSlots, customerSignature, receptionSignature, ...rest } = shapeTechs(o);
      void photoSlots; void customerSignature; void receptionSignature;
      const shaped = { ...rest, receptionSigned: !!o.receptionSignedAt, slotProgress: { total: slots.length, done: slots.filter((s) => s._count.photos > 0).length } };
      return tech ? forTechnician(shaped) : shaped;
    });

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

// Crea la orden con su número, las fotos de recepción obligatorias y su historial de servicio.
// El número se calcula como último+1; si dos órdenes chocan (unique), se reintenta.
const createOrderRecord = async ({ workshopId, customerId, vehicleId, data }) => {
  let order;
  for (let attempt = 0; attempt < 4; attempt++) {
    const orderNumber = await generateOrderNumber(workshopId);
    try {
      order = await prisma.workOrder.create({
        data: {
          workshopId, orderNumber, customerId, vehicleId,
          ...data,
          // Fotos de recepción obligatorias (las toma supervisor/admin al levantar la orden)
          photoSlots: { create: RECEPTION_SLOTS.map((label) => ({ label, kind: 'RECEPTION' })) },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true } },
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
  return order;
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    await ensure.customer(req.body.customerId, workshopId);
    await ensure.vehicle(req.body.vehicleId, workshopId, req.body.customerId);
    const data = orderSchema.parse(
      pick(req.body, ['description', 'diagnosis', 'recommendations', 'technicianNotes', 'estimatedReady', 'mileageIn'])
    );
    const order = await createOrderRecord({ workshopId, customerId: req.body.customerId, vehicleId: req.body.vehicleId, data });
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
        technicians: TECHS_INCLUDE,
        quotes: { include: { items: true } },
        photos: { orderBy: { takenAt: 'desc' } },
        photoSlots: { orderBy: { createdAt: 'asc' }, include: { photos: { orderBy: { takenAt: 'desc' } } } },
        workOrderParts: { include: { part: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        serviceHistory: true,
      },
    });
    if (!order) return notFound(res);
    const shaped = { ...shapeTechs(order), flow: await getFlowView(order.id) };
    ok(res, tech ? forTechnician(shaped) : shaped);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const order = await loadOrder(req, { select: { id: true, workshopId: true, receptionSignedAt: true } });
    if (!order) return notFound(res);

    // El técnico solo escribe diagnóstico, recomendaciones y sus notas
    const fields = isTech(req)
      ? ['diagnosis', 'recommendations', 'technicianNotes']
      : ['description', 'diagnosis', 'recommendations', 'technicianNotes', 'estimatedReady', 'mileageIn', 'mileageOut', 'fuelLevel', 'belongings', 'receptionNotes'];
    const data = orderSchema.partial().parse(pick(req.body, fields));

    if (order.receptionSignedAt && RECEPTION_FIELDS.some((k) => k in data)) {
      return error(res, 'La recepción ya fue firmada por el cliente. Un administrador debe anular la firma para modificar estos datos.', 409);
    }

    // Asignación de técnicos (uno o varios): reemplaza la lista completa
    let technicianIds = null;
    if (!isTech(req) && 'technicianIds' in req.body) {
      technicianIds = await ensureTechnicians(req.body.technicianIds, order.workshopId);
    }
    const before = technicianIds
      ? (await prisma.workOrderTechnician.findMany({ where: { workOrderId: order.id }, select: { userId: true } })).map((t) => t.userId)
      : [];
    const updated = await prisma.$transaction(async (tx) => {
      if (technicianIds) {
        await tx.workOrderTechnician.deleteMany({ where: { workOrderId: order.id } });
        if (technicianIds.length) {
          await tx.workOrderTechnician.createMany({ data: technicianIds.map((userId) => ({ workOrderId: order.id, userId })) });
        }
      }
      return tx.workOrder.update({ where: { id: order.id }, data });
    });
    await autoAdvanceSafe(order.id); // un diagnóstico o nota del técnico inicia el diagnóstico
    if (technicianIds) {
      notifyAssignment({ actorId: req.user.id, workshopId: order.workshopId, orderId: order.id, before, after: technicianIds }).catch(() => {});
    }
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
    await autoAdvanceSafe(order.id);
    ok(res, { message: 'Cotización vinculada' });
  } catch (e) { next(e); }
};

// Línea de la orden: refacción del inventario O concepto libre (se escribe la descripción y el precio)
// Firma de conformidad del cliente al dejar su vehículo (se captura en el mostrador)
const signSchema = z.object({
  signature: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'Firma inválida').max(700_000, 'Firma demasiado grande'),
  signedBy: z.string().trim().min(2, 'Escribe el nombre de quien firma').max(120),
});

const signReception = async (req, res, next) => {
  try {
    const { orderId, workshopId } = req.params;
    const order = await prisma.workOrder.findFirst({ where: { id: orderId, workshopId }, select: { id: true, receptionSignedAt: true } });
    if (!order) return notFound(res);
    if (order.receptionSignedAt) return error(res, 'La recepción ya está firmada', 409);

    // Se firma sobre un estado documentado: todas las fotos de recepción deben existir
    const slots = await prisma.orderPhotoSlot.findMany({ where: { workOrderId: orderId, kind: 'RECEPTION' }, select: { _count: { select: { photos: true } } } });
    const missing = slots.filter((s) => s._count.photos === 0).length;
    if (missing > 0) return error(res, `Faltan ${missing} foto(s) de recepción antes de pedir la firma del cliente.`, 409);

    const body = signSchema.parse(req.body);
    const upd = await prisma.workOrder.updateMany({
      where: { id: orderId, receptionSignedAt: null }, // condicionado: evita doble firma simultánea
      data: { receptionSignature: body.signature, receptionSignedAt: new Date(), receptionSignedBy: body.signedBy },
    });
    if (upd.count === 0) return error(res, 'La recepción ya está firmada', 409);
    ok(res, { message: 'Recepción firmada', receptionSignedAt: new Date() });
  } catch (e) { next(e); }
};

// Solo administrador: anula la firma para corregir la recepción (después se vuelve a firmar)
const clearReceptionSignature = async (req, res, next) => {
  try {
    const { orderId, workshopId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    await prisma.workOrder.update({ where: { id: orderId }, data: { receptionSignature: null, receptionSignedAt: null, receptionSignedBy: null } });
    ok(res, { message: 'Firma anulada' });
  } catch (e) { next(e); }
};

const partSchema = z
  .object({
    partId: optionalStr,
    description: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().max(300).optional()),
    quantity: num.positive('La cantidad debe ser mayor a 0'),
    unitPrice: num.min(0, 'El precio no puede ser negativo').optional(),
  })
  .refine((d) => d.partId || d.description, { message: 'Elige una refacción o escribe una descripción', path: ['description'] })
  .refine((d) => d.partId || d.unitPrice !== undefined, { message: 'Escribe el precio del concepto', path: ['unitPrice'] });

const addPart = async (req, res, next) => {
  try {
    const { orderId, workshopId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    const body = partSchema.parse(req.body);
    const part = body.partId ? await ensure.part(body.partId, workshopId) : null;
    const unitPrice = body.unitPrice ?? Number(part.unitPrice);

    const row = await prisma.workOrderPart.create({
      data: {
        workOrderId: orderId,
        partId: body.partId || null,
        description: body.description || null,
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

// Se quita por id de la línea (las líneas libres no tienen refacción)
const removePart = async (req, res, next) => {
  try {
    const { orderId, workshopId, lineId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    const del = await prisma.workOrderPart.deleteMany({ where: { id: lineId, workOrderId: orderId } });
    if (del.count === 0) return notFound(res, 'Línea no encontrada');
    await recalcOrderTotal(orderId);
    ok(res, { message: 'Línea removida' });
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
  createOrderRecord, list, create, getOne, update, updateStatus, updatePayment, linkQuote,
  listPayments, addPayment, removePayment, addPart, removePart, signReception, clearReceptionSignature, remove,
};


