const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'forevercustoms472@gmail.com';
const ADMIN_PASSWORD = 'Admin123!';

async function main() {
  // Workshop
  const workshop = await prisma.workshop.upsert({
    where: { slug: '4evrcustoms' },
    update: {},
    create: {
      name: '4EVRcustoms',
      slug: '4evrcustoms',
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

  // Admin user — identificado de forma robusta (maneja cambio de teléfono/correo
  // y posibles usuarios duplicados de pruebas previas).
  const ADMIN_PHONE = '+524721082970';
  const OLD_ADMIN_PHONE = '+526641000001';
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // 1) Identifica al admin: primero por su membresía de taller (el real),
  //    si no, por teléfono (nuevo o viejo) o correo.
  const adminMembership = await prisma.workshopUser.findFirst({
    where: { workshopId: workshop.id, role: 'WORKSHOP_ADMIN' },
    orderBy: { createdAt: 'asc' },
  });
  let adminUser = adminMembership
    ? await prisma.user.findUnique({ where: { id: adminMembership.userId } })
    : await prisma.user.findFirst({
        where: { OR: [{ phone: ADMIN_PHONE }, { phone: OLD_ADMIN_PHONE }, { email: ADMIN_EMAIL }] },
      });

  // 2) Libera el correo destino de cualquier OTRO usuario (email es opcional → se anula).
  await prisma.user.updateMany({
    where: { email: ADMIN_EMAIL, ...(adminUser ? { NOT: { id: adminUser.id } } : {}) },
    data: { email: null },
  });

  // 3) Resuelve el teléfono destino. Si otro usuario ya lo tiene:
  //    - si es un usuario suelto (sin cliente ni rol) → se elimina para liberarlo;
  //    - si es un usuario real (cliente/staff) → no se le roba; el admin conserva su teléfono.
  let targetPhone = ADMIN_PHONE;
  const phoneHolder = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE } });
  if (phoneHolder && (!adminUser || phoneHolder.id !== adminUser.id)) {
    const [linkedCustomer, membership] = await Promise.all([
      prisma.customer.findFirst({ where: { userId: phoneHolder.id }, select: { id: true } }),
      prisma.workshopUser.findFirst({ where: { userId: phoneHolder.id }, select: { id: true } }),
    ]);
    if (!linkedCustomer && !membership) {
      await prisma.user.delete({ where: { id: phoneHolder.id } });
    } else {
      targetPhone = adminUser ? adminUser.phone : ADMIN_PHONE;
    }
  }

  // 4) Crea o actualiza al admin con el correo/teléfono resueltos.
  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        phone: targetPhone,
        email: ADMIN_EMAIL,
        firstName: 'Administrador',
        lastName: '',
        // Conserva la contraseña existente; solo la fija si no tiene una
        ...(adminUser.passwordHash ? {} : { passwordHash: adminPasswordHash }),
      },
    });
  } else {
    adminUser = await prisma.user.create({
      data: {
        phone: targetPhone,
        email: ADMIN_EMAIL,
        passwordHash: adminPasswordHash,
        firstName: 'Administrador',
        lastName: '',
      },
    });
  }

  await prisma.workshopUser.upsert({
    where: { workshopId_userId: { workshopId: workshop.id, userId: adminUser.id } },
    update: {},
    create: {
      workshopId: workshop.id,
      userId: adminUser.id,
      role: 'WORKSHOP_ADMIN',
    },
  });

  // Technician
  const tech = await prisma.user.upsert({
    where: { phone: '+526641000002' },
    update: {},
    create: {
      phone: '+526641000002',
      firstName: 'Carlos',
      lastName: 'Méndez',
    },
  });

  await prisma.workshopUser.upsert({
    where: { workshopId_userId: { workshopId: workshop.id, userId: tech.id } },
    update: {},
    create: {
      workshopId: workshop.id,
      userId: tech.id,
      role: 'TECHNICIAN',
    },
  });

  // Sample customer
  const customer = await prisma.customer.upsert({
    where: { workshopId_phone: { workshopId: workshop.id, phone: '+526641111111' } },
    update: {},
    create: {
      workshopId: workshop.id,
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+526641111111',
      email: 'juan.perez@email.com',
    },
  });

  // Sample vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      workshopId: workshop.id,
      customerId: customer.id,
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      licensePlate: 'ABC-123',
      color: 'Blanco',
      mileage: 45000,
    },
  });

  // Sample parts
  const parts = await Promise.all([
    prisma.part.upsert({
      where: { workshopId_sku: { workshopId: workshop.id, sku: 'FILT-001' } },
      update: {},
      create: {
        workshopId: workshop.id,
        sku: 'FILT-001',
        name: 'Filtro de aceite',
        brand: 'Bosch',
        unitPrice: 85.0,
      },
    }),
    prisma.part.upsert({
      where: { workshopId_sku: { workshopId: workshop.id, sku: 'ACEIT-001' } },
      update: {},
      create: {
        workshopId: workshop.id,
        sku: 'ACEIT-001',
        name: 'Aceite motor 5W-30 (4L)',
        brand: 'Mobil',
        unitPrice: 320.0,
      },
    }),
    prisma.part.upsert({
      where: { workshopId_sku: { workshopId: workshop.id, sku: 'PAST-001' } },
      update: {},
      create: {
        workshopId: workshop.id,
        sku: 'PAST-001',
        name: 'Pastillas de freno delanteras',
        brand: 'Brembo',
        unitPrice: 450.0,
      },
    }),
  ]);

  console.log('Seed completado:', {
    workshop: workshop.slug,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
    customer: `${customer.firstName} ${customer.lastName}`,
    vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    parts: parts.length,
  });
}

main()
  // No bloquea el deploy: el esquema ya se aplicó con `prisma db push`.
  .catch((e) => { console.error('[seed] Error (no bloquea el deploy):', e.message); })
  .finally(() => prisma.$disconnect());
