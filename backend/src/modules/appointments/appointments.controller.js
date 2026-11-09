const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { z, pick, ensure, dateStr, optionalStr } = require('../../utils/guards');
const { notifyCustomer } = require('../../utils/notify');

const APPT_LABELS = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asististe',
};

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

const apptSchema = z.object({
  scheduledAt: dateStr,
  duration: z.preprocess((v) => (v === '' || v === null || Number.isNaN(v) ? undefined : v), z.coerce.number().int().min(5).max(1440).optional()),
  serviceType: z.string().trim().min(1, 'Requerido').max(100),
  notes: optionalStr,
  assignedToId: optionalStr,
});

const parseDate = (v, name) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw Object.assign(new Error('Fecha inválida: ' + name), { status: 400 });
  return d;
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, from, to, customerId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    if (status && !STATUSES.includes(status)) return error(res, 'Estado inválido');

    const where = {
      workshopId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(from || to) && {
        scheduledAt: {
          ...(from && { gte: parseDate(from, 'from') }),
          ...(to && { lte: parseDate(to, 'to') }),
        },
      },
    };

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    await ensure.customer(req.body.customerId, workshopId);
    await ensure.vehicle(req.body.vehicleId, workshopId, req.body.customerId);
    const data = apptSchema.parse(pick(req.body, ['scheduledAt', 'duration', 'serviceType', 'notes', 'assignedToId']));
    const appointment = await prisma.appointment.create({
      data: { workshopId, customerId: req.body.customerId, vehicleId: req.body.vehicleId, ...data },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, make: true, model: true, year: true } },
      },
    });
    created(res, appointment);
  } catch (e) { next(e); }
};
const getOne = async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, workshopId: req.params.workshopId },
      include: {
        customer: true,
        vehicle: true,
        workOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    });
    if (!appointment) return notFound(res);
    ok(res, appointment);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const apt = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, workshopId: req.params.workshopId },
    });
    if (!apt) return notFound(res);

    const data = apptSchema.partial().parse(pick(req.body, ['scheduledAt', 'duration', 'serviceType', 'notes', 'assignedToId']));
    const updated = await prisma.appointment.update({ where: { id: apt.id }, data });

    // Avisa al cliente si cambió la fecha o los detalles de su cita
    const dateChanged =
      data.scheduledAt && new Date(data.scheduledAt).getTime() !== new Date(apt.scheduledAt).getTime();
    const detailsChanged =
      ('notes' in data && data.notes !== apt.notes) ||
      ('serviceType' in data && data.serviceType !== apt.serviceType) ||
      ('duration' in data && data.duration !== apt.duration);

    if (dateChanged) {
      const fecha = new Date(data.scheduledAt).toLocaleString('es-MX', {
        weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Mexico_City',
      });
      notifyCustomer(
        { customerId: apt.customerId, workshopId: apt.workshopId },
        {
          type: 'APPOINTMENT_REMINDER',
          title: 'Tu cita cambió de fecha',
          body: `Nueva fecha: ${fecha}.`,
          url: '/cliente/citas',
        }
      ).catch(() => {});
    } else if (detailsChanged) {
      notifyCustomer(
        { customerId: apt.customerId, workshopId: apt.workshopId },
        {
          type: 'APPOINTMENT_REMINDER',
          title: 'Tu cita fue actualizada',
          body: 'El taller actualizó los detalles de tu cita.',
          url: '/cliente/citas',
        }
      ).catch(() => {});
    }

    ok(res, updated);
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return error(res, 'Estado inválido');
    const apt = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, workshopId: req.params.workshopId },
    });
    if (!apt) return notFound(res);
    const updated = await prisma.appointment.update({ where: { id: apt.id }, data: { status } });

    if (status && status !== apt.status) {
      notifyCustomer(
        { customerId: apt.customerId, workshopId: apt.workshopId },
        {
          type: 'APPOINTMENT_REMINDER',
          title: `Tu cita: ${APPT_LABELS[status] || status}`,
          body: `Tu cita de "${apt.serviceType}" ahora está ${(APPT_LABELS[status] || status).toLowerCase()}.`,
          url: '/cliente/citas',
        }
      ).catch(() => {});
    }

    ok(res, updated);
  } catch (e) { next(e); }
};

const cancel = async (req, res, next) => {
  try {
    await prisma.appointment.updateMany({
      where: { id: req.params.appointmentId, workshopId: req.params.workshopId },
      data: { status: 'CANCELLED' },
    });
    ok(res, { message: 'Cita cancelada' });
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const { appointmentId, workshopId } = req.params;
    // La orden de trabajo ligada (si existe) se conserva; solo se desvincula de la cita.
    await prisma.$transaction([
      prisma.workOrder.updateMany({ where: { appointmentId, workshopId }, data: { appointmentId: null } }),
      prisma.appointment.deleteMany({ where: { id: appointmentId, workshopId } }),
    ]);
    ok(res, { message: 'Cita eliminada' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, updateStatus, cancel, remove };


