const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { ok, error, notFound } = require('../../utils/response');

const getWorkshop = async (req, res, next) => {
  try {
    ok(res, req.workshop);
  } catch (e) { next(e); }
};

const updateWorkshop = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'email', 'address', 'city', 'state', 'zipCode', 'logoUrl', 'taxId'];
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

const getStats = async (req, res, next) => {
  try {
    const wid = req.params.workshopId;
    const [customers, activeOrders, pendingAppointments, revenue] = await Promise.all([
      prisma.customer.count({ where: { workshopId: wid, isActive: true } }),
      prisma.workOrder.count({ where: { workshopId: wid, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      prisma.appointment.count({ where: { workshopId: wid, status: { in: ['PENDING', 'CONFIRMED'] } } }),
      prisma.workOrder.aggregate({
        where: { workshopId: wid, paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),
    ]);
    ok(res, { customers, activeOrders, pendingAppointments, totalRevenue: revenue._sum.totalAmount || 0 });
  } catch (e) { next(e); }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await prisma.workshopUser.findMany({
      where: { workshopId: req.params.workshopId, isActive: true },
      include: { user: { select: { id: true, phone: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    ok(res, users);
  } catch (e) { next(e); }
};

const addUser = async (req, res, next) => {
  try {
    const { phone, role } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return error(res, 'Usuario no encontrado con ese teléfono', 404);

    const wu = await prisma.workshopUser.upsert({
      where: { workshopId_userId: { workshopId: req.params.workshopId, userId: user.id } },
      update: { role, isActive: true },
      create: { workshopId: req.params.workshopId, userId: user.id, role },
    });
    ok(res, wu, 201);
  } catch (e) { next(e); }
};

const updateUser = async (req, res, next) => {
  try {
    const wu = await prisma.workshopUser.findFirst({
      where: { workshopId: req.params.workshopId, userId: req.params.userId },
    });
    if (!wu) return notFound(res);

    const updated = await prisma.workshopUser.update({
      where: { id: wu.id },
      data: { role: req.body.role, isActive: req.body.isActive },
    });
    ok(res, updated);
  } catch (e) { next(e); }
};

const removeUser = async (req, res, next) => {
  try {
    await prisma.workshopUser.updateMany({
      where: { workshopId: req.params.workshopId, userId: req.params.userId },
      data: { isActive: false },
    });
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
    const allowed = ['firstName', 'lastName', 'email', 'avatarUrl'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
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

const createWorkshop = async (req, res, next) => {
  try {
    const { name, phone, email, password, address, city, state, zipCode, timezone,
            firstName, lastName } = req.body;
    if (!name || !phone) return error(res, 'Nombre y teléfono son requeridos');
    if (!email) return error(res, 'El email es requerido para el administrador');
    if (!password || password.length < 6) return error(res, 'La contraseña debe tener al menos 6 caracteres');

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);

    const existing = await prisma.workshopUser.findFirst({
      where: { userId: req.user.id, isActive: true },
    });
    if (existing) return error(res, 'Ya perteneces a un taller', 409);

    const passwordHash = await bcrypt.hash(password, 12);

    // Update the admin user's profile and credentials
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
    });

    const workshop = await prisma.workshop.create({
      data: {
        name, phone,
        email: email.toLowerCase().trim(),
        address, city, state, zipCode,
        timezone: timezone || 'America/Mexico_City',
        slug: slug + '-' + Date.now().toString(36),
        users: {
          create: { userId: req.user.id, role: 'WORKSHOP_ADMIN' },
        },
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, phone: true, email: true,
        firstName: true, lastName: true, avatarUrl: true,
        workshops: {
          where: { isActive: true },
          select: {
            role: true,
            workshop: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    ok(res, { workshop, user: updatedUser }, 201);
  } catch (e) { next(e); }
};

module.exports = { getWorkshop, updateWorkshop, getStats, listUsers, addUser, updateUser, removeUser, createWorkshop, getMyProfile, updateMe, changePassword };
