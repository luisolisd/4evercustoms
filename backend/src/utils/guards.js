const { z } = require('zod');
const prisma = require('../config/database');

// Copia solo las claves permitidas (evita mass-assignment: workshopId, status, totales, etc.)
const pick = (obj = {}, keys = []) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

// Fecha ISO/fecha-hora válida (acepta string o Date) → Date
const dateStr = z
  .union([z.string(), z.date()])
  .transform((v, ctx) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Fecha inválida' });
      return z.NEVER;
    }
    return d;
  });

// Número (acepta "12.5" o 12.5); rechaza NaN
const num = z.coerce.number().finite();

// Entero opcional que ignora '' / null
const optionalInt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.coerce.number().int().optional()
);

const optionalStr = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().trim().optional()
);

// Verifican que el registro exista Y pertenezca al taller (aislamiento multi-taller)
const ensure = {
  customer: async (id, workshopId) => {
    const r = id && (await prisma.customer.findFirst({ where: { id, workshopId, isActive: true }, select: { id: true } }));
    if (!r) throw httpError('Cliente no válido para este taller', 400);
    return r;
  },
  vehicle: async (id, workshopId, customerId) => {
    const r =
      id &&
      (await prisma.vehicle.findFirst({
        where: { id, workshopId, isActive: true, ...(customerId && { customerId }) },
        select: { id: true, customerId: true },
      }));
    if (!r) throw httpError('Vehículo no válido para este cliente/taller', 400);
    return r;
  },
  workOrder: async (id, workshopId) => {
    const r = id && (await prisma.workOrder.findFirst({ where: { id, workshopId }, select: { id: true, customerId: true } }));
    if (!r) throw httpError('Orden no encontrada', 404);
    return r;
  },
  quote: async (id, workshopId) => {
    const r = id && (await prisma.quote.findFirst({ where: { id, workshopId }, select: { id: true, workOrderId: true, customerId: true, status: true } }));
    if (!r) throw httpError('Cotización no encontrada', 404);
    return r;
  },
  // Persona asignable a trabajos: técnico o administrador (trabajos especiales), activa y del taller
  assignee: async (id, workshopId) => {
    const r = id && (await prisma.workshopUser.findFirst({
      where: { userId: id, workshopId, role: { in: ['TECHNICIAN', 'WORKSHOP_ADMIN'] }, isActive: true, user: { isActive: true } },
      select: { id: true },
    }));
    if (!r) throw httpError('La persona asignada no es válida', 400);
    return r;
  },
  part: async (id, workshopId) => {
    const r = id && (await prisma.part.findFirst({ where: { id, workshopId, isActive: true }, select: { id: true, unitPrice: true } }));
    if (!r) throw httpError('Refacción no válida para este taller', 400);
    return r;
  },
};

// Campos del cliente seguros para exponer (sin passwordHash)
const CUSTOMER_PUBLIC = {
  id: true, workshopId: true, userId: true, firstName: true, lastName: true,
  phone: true, email: true, address: true, notes: true, isActive: true,
  createdAt: true, updatedAt: true,
};

module.exports = { z, pick, httpError, dateStr, num, optionalInt, optionalStr, ensure, CUSTOMER_PUBLIC };
