const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { z, pick, ensure, dateStr, optionalStr, optionalInt } = require('../../utils/guards');

const STATUSES = ['PENDING', 'CONTACTED', 'CONFIRMED', 'DONE', 'CANCELLED'];

const schema = z.object({
  serviceType: z.string().trim().min(1, 'Requerido').max(100),
  dueDate: dateStr,
  notes: optionalStr,
  nextMileage: optionalInt,
});

const INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
  vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
};

// 10 dígitos → agrega lada de México; wa.me exige número internacional sin "+"
const waNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return '52' + d;
  return d;
};

const buildMessage = (r, workshop) => {
  const when = new Date(r.dueDate).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: workshop.timezone || 'America/Mexico_City',
  });
  const car = r.vehicle ? ` ${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.year}` : '';
  const km = r.nextMileage ? ` o a los ${r.nextMileage.toLocaleString('es-MX')} km, lo que ocurra primero` : '';
  return (
    `Hola ${r.customer.firstName}, te saluda ${workshop.name}. ` +
    `Te recordamos que tu vehículo${car} tiene próximo servicio: ${r.serviceType} (${when}${km}). ` +
    `¿Te agendamos una cita? Responde a este mensaje para confirmar. ¡Gracias!`
  );
};

// Agrega el enlace de WhatsApp (clic → se abre el chat con el mensaje listo)
const withWhatsApp = (r, workshop) => {
  const number = waNumber(r.customer?.phone);
  const message = buildMessage(r, workshop);
  return { ...r, whatsappUrl: number.length >= 10 ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null };
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, view, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    if (status && !STATUSES.includes(status)) return error(res, 'Estado inválido');

    const now = new Date();
    const open = { in: ['PENDING', 'CONTACTED', 'CONFIRMED'] };
    const viewWhere = {
      // por atender: aún no confirmados, fecha dentro de 30 días o vencidos
      upcoming: { status: open, dueDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) } },
      overdue: { status: open, dueDate: { lt: now } },
      later: { status: open, dueDate: { gt: new Date(now.getTime() + 30 * 86400000) } },
      closed: { status: { in: ['DONE', 'CANCELLED'] } },
    }[view] || {};

    const where = {
      workshopId,
      ...viewWhere,
      ...(status && { status }),
      ...(search && {
        customer: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        },
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.serviceReminder.findMany({
        where, skip, take: limit,
        orderBy: { dueDate: view === 'closed' ? 'desc' : 'asc' },
        include: INCLUDE,
      }),
      prisma.serviceReminder.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows.map((r) => withWhatsApp(r, req.workshop)),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { customerId, vehicleId, workOrderId } = req.body;
    await ensure.customer(customerId, workshopId);
    if (vehicleId) await ensure.vehicle(vehicleId, workshopId, customerId);
    if (workOrderId) await ensure.workOrder(workOrderId, workshopId);
    const data = schema.parse(pick(req.body, ['serviceType', 'dueDate', 'notes', 'nextMileage']));

    const reminder = await prisma.serviceReminder.create({
      data: {
        workshopId, customerId, ...(vehicleId && { vehicleId }), ...(workOrderId && { workOrderId }),
        ...data, createdById: req.user.id,
      },
      include: INCLUDE,
    });
    created(res, withWhatsApp(reminder, req.workshop));
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const found = await prisma.serviceReminder.findFirst({
      where: { id: req.params.id, workshopId: req.params.workshopId },
      select: { id: true, customerId: true },
    });
    if (!found) return notFound(res);
    if (req.body.vehicleId) await ensure.vehicle(req.body.vehicleId, req.params.workshopId, found.customerId);
    const data = schema.partial().parse(pick(req.body, ['serviceType', 'dueDate', 'notes', 'nextMileage']));
    const reminder = await prisma.serviceReminder.update({
      where: { id: found.id },
      data: { ...data, ...(req.body.vehicleId && { vehicleId: req.body.vehicleId }) },
      include: INCLUDE,
    });
    ok(res, withWhatsApp(reminder, req.workshop));
  } catch (e) { next(e); }
};

// Se llama al hacer clic en "WhatsApp": registra que ya se contactó al cliente
const contact = async (req, res, next) => {
  try {
    const r = await prisma.serviceReminder.updateMany({
      where: { id: req.params.id, workshopId: req.params.workshopId, status: { in: ['PENDING', 'CONTACTED'] } },
      data: { status: 'CONTACTED', contactedAt: new Date() },
    });
    if (r.count === 0) return notFound(res, 'Recordatorio no encontrado o ya cerrado');
    ok(res, { message: 'Contacto registrado' });
  } catch (e) { next(e); }
};

const setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return error(res, 'Estado inválido');
    const r = await prisma.serviceReminder.updateMany({
      where: { id: req.params.id, workshopId: req.params.workshopId },
      data: { status, confirmedAt: status === 'CONFIRMED' ? new Date() : null },
    });
    if (r.count === 0) return notFound(res);
    ok(res, { message: 'Estado actualizado' });
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.serviceReminder.deleteMany({ where: { id: req.params.id, workshopId: req.params.workshopId } });
    ok(res, { message: 'Recordatorio eliminado' });
  } catch (e) { next(e); }
};

module.exports = { list, create, update, contact, setStatus, remove, withWhatsApp, INCLUDE };

