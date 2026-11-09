const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { ok, error, notFound } = require('../../utils/response');
const { z, optionalStr } = require('../../utils/guards');
const { TECHNICIAN } = require('../../utils/roles');

const ROLES = ['WORKSHOP_ADMIN', 'SUPERVISOR', 'TECHNICIAN'];

// Evita dejar el taller sin ningún administrador activo
const otherActiveAdmins = (workshopId, userId) =>
  prisma.workshopUser.count({
    where: { workshopId, role: 'WORKSHOP_ADMIN', isActive: true, NOT: { userId } },
  });

const getWorkshop = async (req, res, next) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.params.workshopId },
    });
    ok(res, workshop);
  } catch (e) { next(e); }
};

const updateWorkshop = async (req, res, next) => {
  try {
    const allowed = ['name', 'legalName', 'phone', 'email', 'address', 'city', 'state', 'zipCode', 'logoUrl', 'taxId'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const workshop = await prisma.workshop.update({
      where: { id: req.params.workshopId },
      data,
    });
    ok(res, workshop);
  } catch (e) { next(e); }
};

const USER_PUBLIC = { id: true, phone: true, email: true, firstName: true, lastName: true, avatarUrl: true, lastLoginAt: true };

const listUsers = async (req, res, next) => {
  try {
    const users = await prisma.workshopUser.findMany({
      where: { workshopId: req.params.workshopId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      include: { user: { select: USER_PUBLIC } },
    });
    ok(res, users);
  } catch (e) { next(e); }
};

// Personal asignable a órdenes: técnicos y administrador (trabajos especiales). Disponible para supervisor y admin.
const listTechnicians = async (req, res, next) => {
  try {
    const rows = await prisma.workshopUser.findMany({
      where: { workshopId: req.params.workshopId, role: { in: [TECHNICIAN, 'WORKSHOP_ADMIN'] }, isActive: true, user: { isActive: true } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    // técnicos primero, el administrador al final
    const sorted = [...rows].sort((a, b) => Number(a.role === 'WORKSHOP_ADMIN') - Number(b.role === 'WORKSHOP_ADMIN'));
    ok(res, sorted.map((r) => ({ ...r.user, role: r.role })));
  } catch (e) { next(e); }
};

const normalizePhone = (v) => {
  const digits = String(v || '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) throw Object.assign(new Error('El teléfono debe tener 10 dígitos'), { status: 400 });
  return '+52' + digits;
};

const createSchema = z.object({
  firstName: z.string().trim().min(1, 'Nombre requerido').max(60),
  lastName: z.string().trim().max(60).default(''),
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  role: z.enum(ROLES),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
});

// El administrador crea usuarios del taller (técnico, supervisor, admin) con correo y contraseña temporal
const createUser = async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const phone = normalizePhone(body.phone);

    const clash = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone }] },
      select: { email: true },
    });
    if (clash) {
      return error(res, clash.email === body.email ? 'Ese correo ya está en uso' : 'Ese teléfono ya está en uso', 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        phone, email: body.email, passwordHash, firstName: body.firstName, lastName: body.lastName,
        workshops: { create: { workshopId: req.params.workshopId, role: body.role } },
      },
      select: USER_PUBLIC,
    });
    ok(res, { ...user, role: body.role }, 201);
  } catch (e) { next(e); }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { password } = z.object({ password: z.string().min(8).max(100) }).parse(req.body);
    const wu = await prisma.workshopUser.findFirst({
      where: { workshopId: req.params.workshopId, userId: req.params.userId },
      select: { id: true },
    });
    if (!wu) return notFound(res);
    await prisma.user.update({ where: { id: req.params.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    ok(res, { message: 'Contraseña actualizada' });
  } catch (e) { next(e); }
};

const updateUser = async (req, res, next) => {
  try {
    const wu = await prisma.workshopUser.findFirst({
      where: { workshopId: req.params.workshopId, userId: req.params.userId },
    });
    if (!wu) return notFound(res);
    if (req.body.role !== undefined && !ROLES.includes(req.body.role)) return error(res, 'Rol inválido');

    const losesAdmin = wu.role === 'WORKSHOP_ADMIN' && wu.isActive &&
      ((req.body.role && req.body.role !== 'WORKSHOP_ADMIN') || req.body.isActive === false);
    if (losesAdmin && (await otherActiveAdmins(req.params.workshopId, wu.userId)) === 0) {
      return error(res, 'El taller debe conservar al menos un administrador', 400);
    }

    const profile = z
      .object({
        firstName: z.string().trim().min(1).max(60).optional(),
        lastName: z.string().trim().max(60).optional(),
        email: z.string().trim().toLowerCase().email().optional(),
        phone: optionalStr,
      })
      .parse(req.body);
    const userData = { ...profile };
    if (profile.phone) userData.phone = normalizePhone(profile.phone);
    if (Object.keys(userData).length) {
      await prisma.user.update({ where: { id: wu.userId }, data: userData });
    }

    const updated = await prisma.workshopUser.update({
      where: { id: wu.id },
      data: {
        ...(req.body.role && { role: req.body.role }),
        ...(typeof req.body.isActive === 'boolean' && { isActive: req.body.isActive }),
      },
    });
    ok(res, updated);
  } catch (e) { next(e); }
};

const removeUser = async (req, res, next) => {
  try {
    const wu = await prisma.workshopUser.findFirst({
      where: { workshopId: req.params.workshopId, userId: req.params.userId },
    });
    if (!wu) return notFound(res);
    if (wu.role === 'WORKSHOP_ADMIN' && wu.isActive && (await otherActiveAdmins(wu.workshopId, wu.userId)) === 0) {
      return error(res, 'El taller debe conservar al menos un administrador', 400);
    }
    await prisma.workshopUser.update({ where: { id: wu.id }, data: { isActive: false } });
    ok(res, { message: 'Usuario removido del taller' });
  } catch (e) { next(e); }
};

const getMyProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, avatarUrl: true },
    });
    ok(res, user);
  } catch (e) { next(e); }
};

const updateMe = async (req, res, next) => {
  try {
    // El técnico solo edita su teléfono; nombre y correo los administra el administrador
    const allowed = req.workshopUser?.role === TECHNICIAN ? ['phone'] : ['firstName', 'lastName', 'email', 'avatarUrl', 'phone'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k) && req.body[k] !== '')
    );

    // Teléfono: normaliza a +52XXXXXXXXXX y libera el número si lo tiene otro usuario
    if (data.phone) {
      const digits = String(data.phone).replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) return error(res, 'El teléfono debe tener 10 dígitos', 400);
      data.phone = `+52${digits}`;

      const holder = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (holder && holder.id !== req.user.id) {
        const [linkedCustomer, membership] = await Promise.all([
          prisma.customer.findFirst({ where: { userId: holder.id }, select: { id: true } }),
          prisma.workshopUser.findFirst({ where: { userId: holder.id }, select: { id: true } }),
        ]);
        if (!linkedCustomer && !membership) {
          await prisma.user.delete({ where: { id: holder.id } }); // usuario suelto → se libera
        } else {
          return error(res, 'Ese número ya está en uso por un cliente. Elimina ese cliente (o usa otro número) y reinténtalo.', 409);
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, avatarUrl: true },
    });
    ok(res, user);
  } catch (e) { next(e); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return error(res, 'La nueva contraseña debe tener al menos 6 caracteres');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });

    if (user.passwordHash) {
      if (!currentPassword) return error(res, 'Contraseña actual requerida');
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return error(res, 'Contraseña actual incorrecta', 401);
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hash } });
    ok(res, { message: 'Contraseña actualizada' });
  } catch (e) { next(e); }
};

module.exports = { getWorkshop, updateWorkshop, listUsers, listTechnicians, createUser, resetUserPassword, updateUser, removeUser, getMyProfile, updateMe, changePassword };

