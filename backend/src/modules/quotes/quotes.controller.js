const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { recalcOrderTotal } = require('../../utils/orderTotals');
const { notifyCustomer } = require('../../utils/notify');
const { syncQuoteReminder } = require('../../utils/quoteReminders');
const { autoAdvanceSafe } = require('../../utils/orderFlow');
const { createOrderRecord } = require('../workorders/workorders.controller');
const { CUSTOMER_PUBLIC, z, pick, ensure, dateStr, num, optionalStr, httpError } = require('../../utils/guards');

const STATUSES = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'];
const optDate = z.preprocess((v) => (v === '' || v === null ? undefined : v), dateStr.optional());

// Usa el último número real + 1 (no el conteo) para no chocar tras borrar cotizaciones.
const generateQuoteNumber = async (workshopId) => {
  const last = await prisma.quote.findFirst({
    where: { workshopId },
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true },
  });
  const n = last ? (parseInt(String(last.quoteNumber).replace(/\D/g, ''), 10) || 0) : 0;
  return `COT-${String(n + 1).padStart(5, '0')}`;
};

const recalcTotals = async (quoteId) => {
  const items = await prisma.quoteItem.findMany({ where: { quoteId } });
  // Los precios capturados por el admin ya son finales (IVA incluido): no se suma impuesto extra.
  const total = items.reduce((s, i) => s + Number(i.total), 0);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { subtotal: total, tax: 0, total },
  });
};

// La orden debe existir en el taller y ser del mismo cliente que la cotización
const checkOrderLink = async (workOrderId, customerId, workshopId) => {
  const order = await ensure.workOrder(workOrderId, workshopId);
  if (order.customerId !== customerId) throw httpError('La orden es de otro cliente', 400);
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, customerId, unlinked, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    if (status && !STATUSES.includes(status)) return error(res, 'Estado inválido');

    const where = {
      workshopId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { quoteNumber: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
      ...(unlinked === 'true' && { workOrderId: null }), // cotizaciones sin orden de trabajo
    };
    const [data, total] = await Promise.all([
      prisma.quote.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          // El listado muestra las líneas de cada cotización (sin ellas "Agregar línea" parecía no hacer nada)
          items: { orderBy: { id: 'asc' }, select: { id: true, description: true, quantity: true, unitPrice: true, total: true, isLabor: true, partId: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.quote.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { customerId, workOrderId } = req.body;
    const body = z
      .object({ notes: optionalStr, validUntil: optDate })
      .parse(pick(req.body, ['notes', 'validUntil']));
    await ensure.customer(customerId, workshopId);
    if (workOrderId) await checkOrderLink(workOrderId, customerId, workshopId);

    // El número se calcula como último+1; si dos cotizaciones chocan (unique), se reintenta.
    let quote;
    for (let attempt = 0; attempt < 4; attempt++) {
      const quoteNumber = await generateQuoteNumber(workshopId);
      try {
        quote = await prisma.quote.create({
          data: { workshopId, quoteNumber, customerId, ...(workOrderId && { workOrderId }), ...body },
        });
        break;
      } catch (e) {
        if (e.code !== 'P2002' || attempt === 3) throw e;
      }
    }
    created(res, quote);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, workshopId: req.params.workshopId },
      include: { items: { include: { part: true } }, customer: { select: CUSTOMER_PUBLIC }, workOrder: true },
    });
    if (!quote) return notFound(res);
    ok(res, quote);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const { workshopId, quoteId } = req.params;
    const quote = await ensure.quote(quoteId, workshopId);
    const data = z
      .object({ notes: optionalStr, validUntil: optDate, workOrderId: z.string().nullable().optional() })
      .parse(pick(req.body, ['notes', 'validUntil', 'workOrderId']));

    if (data.workOrderId) await checkOrderLink(data.workOrderId, quote.customerId, workshopId);
    const updated = await prisma.quote.update({ where: { id: quote.id }, data });

    // Si cambió la orden ligada, recalcula el total de la anterior y de la nueva
    if (data.workOrderId !== undefined && data.workOrderId !== quote.workOrderId) {
      if (quote.workOrderId) await recalcOrderTotal(quote.workOrderId);
      if (data.workOrderId) await recalcOrderTotal(data.workOrderId);
    }
    ok(res, updated);
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!STATUSES.includes(status)) return error(res, 'Estado inválido');
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, workshopId: req.params.workshopId },
    });
    if (!quote) return notFound(res);

    const data = {
      status,
      approvedAt: status === 'APPROVED' ? new Date() : null,
      rejectedAt: status === 'REJECTED' ? new Date() : null,
      rejectionReason: status === 'REJECTED' ? rejectionReason || null : null,
    };

    const updated = await prisma.quote.update({ where: { id: quote.id }, data });
    await syncQuoteReminder(quote.id); // seguimiento si quedó enviada; se cierra en cualquier otro estado
    if (quote.workOrderId) await autoAdvanceSafe(quote.workOrderId); // enviada → esperando autorización · aprobada → en reparación

    // Si la cotización está ligada a una orden, recalcula su total (solo cuentan las aprobadas)
    if (quote.workOrderId) await recalcOrderTotal(quote.workOrderId);

    // Avisa al cliente cuando el taller le envía una cotización para aprobar
    if (status === 'SENT' && quote.status !== 'SENT') {
      notifyCustomer(
        { customerId: quote.customerId, workshopId: quote.workshopId },
        {
          type: 'QUOTE_READY',
          title: 'Tienes una cotización por aprobar',
          body: `Cotización #${quote.quoteNumber} lista. Revísala y apruébala o recházala.`,
          url: quote.workOrderId ? `/cliente/orden/${quote.workOrderId}` : '/cliente/avisos',
        }
      ).catch(() => {});
    }

    ok(res, updated);
  } catch (e) { next(e); }
};

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Requerido').max(300),
  partId: optionalStr,
  quantity: num.positive('La cantidad debe ser mayor a 0'),
  unitPrice: num.min(0, 'El precio no puede ser negativo'),
  isLabor: z.boolean().optional(),
});

const addItem = async (req, res, next) => {
  try {
    const { workshopId, quoteId } = req.params;
    const quote = await ensure.quote(quoteId, workshopId);
    const body = itemSchema.parse(req.body);
    if (body.partId) await ensure.part(body.partId, workshopId);

    const item = await prisma.quoteItem.create({
      data: {
        quoteId,
        description: body.description,
        partId: body.partId || null,
        quantity: body.quantity,
        unitPrice: body.unitPrice,
        total: Math.round(body.quantity * body.unitPrice * 100) / 100,
        isLabor: body.isLabor || false,
      },
    });
    await recalcTotals(quoteId);
    if (quote.workOrderId) await recalcOrderTotal(quote.workOrderId);
    ok(res, item, 201);
  } catch (e) { next(e); }
};

const removeItem = async (req, res, next) => {
  try {
    const { workshopId, quoteId, itemId } = req.params;
    const quote = await ensure.quote(quoteId, workshopId);
    const del = await prisma.quoteItem.deleteMany({ where: { id: itemId, quoteId } });
    if (del.count === 0) return notFound(res, 'Ítem no encontrado');
    await recalcTotals(quoteId);
    if (quote.workOrderId) await recalcOrderTotal(quote.workOrderId);
    ok(res, { message: 'Item eliminado' });
  } catch (e) { next(e); }
};

// Genera una orden de trabajo desde una cotización. Regla: solo cotizaciones APROBADAS y sin orden.
const createOrder = async (req, res, next) => {
  try {
    const { workshopId, quoteId } = req.params;
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, workshopId },
      include: { items: { select: { description: true } } },
    });
    if (!quote) return notFound(res);
    if (quote.status !== 'APPROVED') {
      return error(res, 'Solo una cotización aprobada puede generar una orden. Confirma primero con el cliente.', 409);
    }
    if (quote.workOrderId) return error(res, 'Esta cotización ya tiene una orden', 409);

    // El vehículo debe ser del cliente de la cotización
    await ensure.vehicle(req.body.vehicleId, workshopId, quote.customerId);

    const summary = quote.items.map((i) => i.description).join(', ');
    const description = `Cotización ${quote.quoteNumber}${summary ? `: ${summary}` : ''}`.slice(0, 500);
    const order = await createOrderRecord({
      workshopId, customerId: quote.customerId, vehicleId: req.body.vehicleId, data: { description },
    });

    // Ligar con condición: si dos personas hacen clic a la vez, solo una orden queda ligada
    const linked = await prisma.quote.updateMany({ where: { id: quote.id, workOrderId: null }, data: { workOrderId: order.id } });
    if (linked.count === 0) {
      await prisma.serviceHistory.deleteMany({ where: { workOrderId: order.id } });
      await prisma.workOrder.delete({ where: { id: order.id } });
      return error(res, 'Esta cotización ya tiene una orden', 409);
    }
    await recalcOrderTotal(order.id); // la cotización aprobada define el total
    await autoAdvanceSafe(order.id);   // aprobada → la orden entra en reparación
    created(res, order);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, workshopId: req.params.workshopId },
      select: { id: true, workOrderId: true },
    });
    if (!quote) return notFound(res);
    await prisma.quote.delete({ where: { id: quote.id } }); // los items se borran en cascada
    if (quote.workOrderId) await recalcOrderTotal(quote.workOrderId);
    ok(res, { message: 'Cotización eliminada' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, updateStatus, addItem, removeItem, createOrder, remove };
