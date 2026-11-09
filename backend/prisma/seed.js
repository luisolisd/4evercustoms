/**
 * Seed idempotente y SEGURO para producción.
 *  - Solo crea lo que falta: nunca sobreescribe contraseñas, nunca borra usuarios.
 *  - Credenciales del admin inicial vía variables de entorno (no hay contraseña en el código):
 *      SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (obligatoria), SEED_ADMIN_PHONE
 *  - Datos de ejemplo (cliente/vehículo/refacciones) solo fuera de producción.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'forevercustoms472@gmail.com').toLowerCase();
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || '+524721082970';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

async function main() {
  const workshop = await prisma.workshop.upsert({
    where: { slug: '4evrcustoms' },
    update: {},
    create: {
      name: '4EVRcustoms',
      slug: '4evrcustoms',
      legalName: 'PEDRO RAMIRO SOLIS DURAN',
      taxId: 'SODP871115H1A',
      phone: '+526641234567',
      email: 'contacto@4evrcustoms.mx',
      address: 'Blvd. Insurgentes 1234',
      city: 'Tijuana',
      state: 'Baja California',
      zipCode: '22010',
      country: 'MX',
      timezone: 'America/Tijuana',
    },
  });

  // Admin: solo se crea si no existe ningún administrador en el taller
  const hasAdmin = await prisma.workshopUser.findFirst({
    where: { workshopId: workshop.id, role: 'WORKSHOP_ADMIN' },
    select: { id: true },
  });

  if (!hasAdmin) {
    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
      console.warn('[seed] Sin administrador y SEED_ADMIN_PASSWORD no está definida (mín. 8 caracteres). Define la variable y vuelve a desplegar.');
    } else {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email: ADMIN_EMAIL }, { phone: ADMIN_PHONE }] },
      });
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { email: existing.email || ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) },
          })
        : await prisma.user.create({
            data: {
              phone: ADMIN_PHONE,
              email: ADMIN_EMAIL,
              passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
              firstName: 'Administrador',
              lastName: '',
            },
          });
      await prisma.workshopUser.upsert({
        where: { workshopId_userId: { workshopId: workshop.id, userId: user.id } },
        update: { role: 'WORKSHOP_ADMIN', isActive: true },
        create: { workshopId: workshop.id, userId: user.id, role: 'WORKSHOP_ADMIN' },
      });
      console.log(`[seed] Administrador creado: ${ADMIN_EMAIL}`);
    }
  }

  // Historial de pagos: las órdenes con monto pagado previo al registro de pagos reciben un pago
  // inicial (efectivo) para que el corte de caja y los ingresos del mes cuadren. Idempotente.
  const legacy = await prisma.workOrder.findMany({
    where: { paidAmount: { gt: 0 }, payments: { none: {} } },
    select: { id: true, workshopId: true, paidAmount: true, paidAt: true, updatedAt: true },
  });
  for (const o of legacy) {
    await prisma.payment.create({
      data: {
        workshopId: o.workshopId, workOrderId: o.id, amount: o.paidAmount, method: 'OTHER',
        note: 'Pago histórico (migrado)', createdAt: o.paidAt || o.updatedAt,
      },
    });
  }
  if (legacy.length) console.log(`[seed] ${legacy.length} pago(s) histórico(s) migrado(s).`);

  // Cotizaciones enviadas y sin respuesta que aún no tienen recordatorio de seguimiento (anteriores a esta función)
  const pendingQuotes = await prisma.quote.findMany({
    where: { status: 'SENT', reminders: { none: { status: { in: ['PENDING', 'CONTACTED', 'CONFIRMED'] } } } },
    select: { id: true, workshopId: true, customerId: true, workOrderId: true, quoteNumber: true, validUntil: true },
  });
  for (const q of pendingQuotes) {
    const followUp = Date.now() + 2 * 24 * 60 * 60 * 1000;
    const due = q.validUntil && q.validUntil.getTime() > Date.now() ? Math.min(q.validUntil.getTime(), followUp) : followUp;
    await prisma.serviceReminder.create({
      data: {
        workshopId: q.workshopId, customerId: q.customerId, workOrderId: q.workOrderId, quoteId: q.id,
        type: 'QUOTE', serviceType: `Confirmar cotización ${q.quoteNumber}`, dueDate: new Date(due),
      },
    });
  }
  if (pendingQuotes.length) console.log(`[seed] ${pendingQuotes.length} recordatorio(s) de cotización creado(s).`);

  // Repara refacciones sin registro de existencias (no aparecían en Inventario). Idempotente.
  const orphans = await prisma.part.findMany({ where: { inventory: { is: null } }, select: { id: true, workshopId: true } });
  if (orphans.length) {
    await prisma.inventory.createMany({ data: orphans.map((p) => ({ workshopId: p.workshopId, partId: p.id })), skipDuplicates: true });
    console.log(`[seed] ${orphans.length} refacción(es) sin existencias reparada(s).`);
  }

  if (!isProd) {
    const customer = await prisma.customer.upsert({
      where: { workshopId_phone: { workshopId: workshop.id, phone: '6641111111' } },
      update: {},
      create: { workshopId: workshop.id, firstName: 'Juan', lastName: 'Pérez', phone: '6641111111', email: 'juan.perez@email.com' },
    });
    await prisma.vehicle.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001', workshopId: workshop.id, customerId: customer.id,
        make: 'Toyota', model: 'Corolla', year: 2020, licensePlate: 'ABC-123', color: 'Blanco', mileage: 45000,
      },
    });
    for (const [sku, name, brand, unitPrice] of [
      ['FILT-001', 'Filtro de aceite', 'Bosch', 85],
      ['ACEIT-001', 'Aceite motor 5W-30 (4L)', 'Mobil', 320],
      ['PAST-001', 'Pastillas de freno delanteras', 'Brembo', 450],
    ]) {
      await prisma.part.upsert({
        where: { workshopId_sku: { workshopId: workshop.id, sku } },
        update: {},
        create: {
          workshopId: workshop.id, sku, name, brand, unitPrice,
          inventory: { create: { workshopId: workshop.id, quantity: 10, minQuantity: 3 } },
        },
      });
    }
    console.log('[seed] Datos de ejemplo creados (solo desarrollo).');
  }
}

main()
  // No bloquea el deploy: el esquema ya se aplicó con `prisma db push`.
  .catch((e) => { console.error('[seed] Error (no bloquea el deploy):', e.message); })
  .finally(() => prisma.$disconnect());
