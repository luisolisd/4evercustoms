const prisma = require('../../config/database');
const { ok } = require('../../utils/response');
const { withWhatsApp, INCLUDE: REMINDER_INCLUDE } = require('../reminders/reminders.controller');

// Estatus "en el taller": el vehículo ya ingresó y aún no está listo para entrega
const IN_SHOP = ['RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR', 'FINAL_TESTING'];
const DAY = 24 * 60 * 60 * 1000;

// Medianoche de hoy en la zona horaria del taller
const startOfDayInTz = (tz) => {
  const now = new Date();
  try {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const offset = new Date(now.toLocaleString('en-US', { timeZone: tz })) - new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(new Date(`${ymd}T00:00:00Z`).getTime() - offset);
  } catch {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
};

// Panel operativo: lo que hay que atender hoy. Sin dinero (los cobros viven en el corte de caja).
const getDashboard = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const now = new Date();
    const startToday = startOfDayInTz(req.workshop.timezone || 'America/Mexico_City');
    const endToday = new Date(startToday.getTime() + DAY);
    const horizon = new Date(startToday.getTime() + 8 * DAY);
    const remindersHorizon = new Date(now.getTime() + 14 * DAY);
    const openReminder = { in: ['PENDING', 'CONTACTED'] };

    const [inWork, readyForPickup, toEnter, toConfirm, toEnterToday, reminders, remindersTotal, remindersOverdue] =
      await Promise.all([
        prisma.workOrder.findMany({
          where: { workshopId, status: { in: IN_SHOP } },
          orderBy: { receivedAt: 'asc' },
          take: 40,
          select: {
            id: true, orderNumber: true, status: true, description: true, receivedAt: true, estimatedReady: true,
            customer: { select: { firstName: true, lastName: true } },
            vehicle: { select: { make: true, model: true, year: true, licensePlate: true } },
            technicians: { select: { user: { select: { id: true, firstName: true, lastName: true } } } },
            photoSlots: { where: { kind: 'TECH' }, select: { _count: { select: { photos: true } } } },
          },
        }),
        prisma.workOrder.count({ where: { workshopId, status: 'READY_FOR_PICKUP' } }),
        // Por ingresar: citas confirmadas de hoy en adelante (próximos 7 días) que aún no tienen orden
        prisma.appointment.findMany({
          where: { workshopId, status: 'CONFIRMED', scheduledAt: { gte: startToday, lt: horizon }, workOrder: { is: null } },
          orderBy: { scheduledAt: 'asc' },
          take: 12,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            vehicle: { select: { make: true, model: true, year: true, licensePlate: true } },
          },
        }),
        // Por confirmar: citas pendientes (incluye las que pide el cliente desde su portal)
        prisma.appointment.findMany({
          where: { workshopId, status: 'PENDING', scheduledAt: { gte: startToday } },
          orderBy: { scheduledAt: 'asc' },
          take: 12,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            vehicle: { select: { make: true, model: true, year: true, licensePlate: true } },
          },
        }),
        prisma.appointment.count({
          where: { workshopId, status: 'CONFIRMED', scheduledAt: { gte: startToday, lt: endToday }, workOrder: { is: null } },
        }),
        prisma.serviceReminder.findMany({
          where: { workshopId, status: openReminder, dueDate: { lte: remindersHorizon } },
          orderBy: { dueDate: 'asc' },
          take: 8,
          include: REMINDER_INCLUDE,
        }),
        prisma.serviceReminder.count({ where: { workshopId, status: openReminder, dueDate: { lte: remindersHorizon } } }),
        prisma.serviceReminder.count({ where: { workshopId, status: openReminder, dueDate: { lt: now } } }),
      ]);

    const orders = inWork.map((o) => {
      const slots = o.photoSlots || [];
      const { photoSlots, technicians, ...rest } = o;
      void photoSlots;
      return {
        ...rest,
        technicians: technicians.map((t) => t.user),
        photos: { total: slots.length, done: slots.filter((s) => s._count.photos > 0).length },
        daysInShop: Math.floor((now - o.receivedAt) / DAY),
        late: !!o.estimatedReady && o.estimatedReady < now,
      };
    });

    ok(res, {
      generatedAt: now,
      counts: {
        inWork: orders.length,
        unassigned: orders.filter((o) => o.technicians.length === 0).length,
        awaitingAuth: orders.filter((o) => o.status === 'AWAITING_AUTH').length,
        late: orders.filter((o) => o.late).length,
        readyForPickup,
        toEnterToday,
        toEnter: toEnter.length,
        toConfirm: toConfirm.length,
        reminders: remindersTotal,
        remindersOverdue,
      },
      inWork: orders,
      toEnter,
      toConfirm,
      reminders: reminders.map((r) => withWhatsApp(r, req.workshop)),
    });
  } catch (e) { next(e); }
};

module.exports = { getDashboard };
