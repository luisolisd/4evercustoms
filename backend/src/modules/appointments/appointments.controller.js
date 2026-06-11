const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { cleanData } = require('../../utils/sanitize');
const { notifyCustomer } = require('../../utils/notify');

const APPT_LABELS = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asististe',
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, from, to, customerId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = {
      workshopId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(from || to) && {
        scheduledAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
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
    const appointment = await prisma.appointment.create({
      data: { workshopId: req.params.workshopId, ...cleanData(req.body, ['scheduledAt']) },
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

    const allowed = ['scheduledAt', 'duration', 'serviceType', 'notes', 'assignedToId'];
    const data = cleanData(
      Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k))),
      ['scheduledAt']
    );
    const updated = await prisma.appointment.update({ where: { id: apt.id }, data });
    ok(res, updated);
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
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

module.exports = { list, create, getOne, update, updateStatus, cancel };
