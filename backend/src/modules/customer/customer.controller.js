const prisma = require('../../config/database');
const { ok, error, notFound } = require('../../utils/response');

// ── Perfil + taller ──────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    ok(res, req.customer);
  } catch (e) { next(e); }
};

// ── Vehículos del cliente (con estatus de su orden más reciente) ─────────────
const vehicles = async (req, res, next) => {
  try {
    const list = await prisma.vehicle.findMany({
      where: { customerId: req.customer.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, make: true, model: true, year: true,
        licensePlate: true, color: true, mileage: true,
        workOrders: {
          orderBy: { receivedAt: 'desc' },
          take: 1,
          select: { id: true, orderNumber: true, status: true, receivedAt: true, estimatedReady: true },
        },
      },
    });
    ok(res, list);
  } catch (e) { next(e); }
};

// ── Detalle de un vehículo + sus órdenes ─────────────────────────────────────
const vehicleDetail = async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.vehicleId, customerId: req.customer.id },
      select: {
        id: true, make: true, model: true, year: true, vin: true,
        licensePlate: true, color: true, engineType: true, mileage: true,
        workOrders: {
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true, orderNumber: true, status: true, description: true,
            receivedAt: true, estimatedReady: true, deliveredAt: true,
            totalAmount: true, paymentStatus: true,
          },
        },
      },
    });
    if (!vehicle) return notFound(res, 'Vehículo no encontrado');
    ok(res, vehicle);
  } catch (e) { next(e); }
};

// ── Detalle completo de una orden (estatus, fotos, cotizaciones, historial) ──
const workOrderDetail = async (req, res, next) => {
  try {
    const order = await prisma.workOrder.findFirst({
      where: { id: req.params.orderId, customerId: req.customer.id },
      select: {
        id: true, orderNumber: true, status: true, description: true, diagnosis: true,
        receivedAt: true, estimatedReady: true, deliveredAt: true,
        mileageIn: true, mileageOut: true,
        totalAmount: true, paidAmount: true, paymentStatus: true,
        vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
        photos: {
          orderBy: { takenAt: 'desc' },
          select: { id: true, url: true, thumbnailUrl: true, caption: true, takenAt: true },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, quoteNumber: true, status: true, total: true, validUntil: true, notes: true,
            items: { select: { id: true, description: true, quantity: true, unitPrice: true, total: true } },
          },
        },
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
          select: { id: true, serviceDate: true, description: true, mileage: true },
        },
      },
    });
    if (!order) return notFound(res, 'Orden no encontrada');
    ok(res, order);
  } catch (e) { next(e); }
};

// ── Citas ────────────────────────────────────────────────────────────────────
const appointments = async (req, res, next) => {
  try {
    const list = await prisma.appointment.findMany({
      where: { customerId: req.customer.id },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      select: {
        id: true, scheduledAt: true, serviceType: true, notes: true, status: true,
        vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
      },
    });
    ok(res, list);
  } catch (e) { next(e); }
};

const createAppointment = async (req, res, next) => {
  try {
    const { vehicleId, scheduledAt, serviceType, notes } = req.body;
    if (!vehicleId || !scheduledAt || !serviceType) {
      return error(res, 'Vehículo, fecha y tipo de servicio son requeridos');
    }
    // El vehículo debe pertenecer al cliente
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, customerId: req.customer.id, isActive: true },
      select: { id: true },
    });
    if (!vehicle) return error(res, 'Vehículo inválido', 400);

    const appt = await prisma.appointment.create({
      data: {
        workshopId: req.customer.workshopId,
        customerId: req.customer.id,
        vehicleId,
        scheduledAt: new Date(scheduledAt),
        serviceType,
        notes: notes || null,
        status: 'PENDING',
      },
      select: { id: true, scheduledAt: true, serviceType: true, status: true },
    });
    ok(res, appt, 201);
  } catch (e) { next(e); }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      select: { id: true, status: true },
    });
    if (!appt) return notFound(res, 'Cita no encontrada');
    if (['COMPLETED', 'CANCELLED'].includes(appt.status)) {
      return error(res, 'Esta cita ya no se puede cancelar', 400);
    }
    await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'CANCELLED' } });
    ok(res, { message: 'Cita cancelada' });
  } catch (e) { next(e); }
};

// ── Cotizaciones: aprobar / rechazar ─────────────────────────────────────────
const respondQuote = async (req, res, next) => {
  try {
    const { decision, reason } = req.body; // 'APPROVED' | 'REJECTED'
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return error(res, 'Decisión inválida', 400);
    }
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      select: { id: true, status: true },
    });
    if (!quote) return notFound(res, 'Cotización no encontrada');
    if (!['SENT', 'DRAFT'].includes(quote.status)) {
      return error(res, 'Esta cotización ya no admite cambios', 400);
    }
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: decision === 'APPROVED'
        ? { status: 'APPROVED', approvedAt: new Date() }
        : { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason || null },
      select: { id: true, status: true },
    });
    ok(res, updated);
  } catch (e) { next(e); }
};

// ── Notificaciones ───────────────────────────────────────────────────────────
const notifications = async (req, res, next) => {
  try {
    const list = await prisma.notification.findMany({
      where: { customerId: req.customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, title: true, body: true, isRead: true, createdAt: true },
    });
    ok(res, list);
  } catch (e) { next(e); }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, customerId: req.customer.id },
      data: { isRead: true, readAt: new Date() },
    });
    ok(res, { message: 'Leída' });
  } catch (e) { next(e); }
};

module.exports = {
  me,
  vehicles,
  vehicleDetail,
  workOrderDetail,
  appointments,
  createAppointment,
  cancelAppointment,
  respondQuote,
  notifications,
  markNotificationRead,
};
