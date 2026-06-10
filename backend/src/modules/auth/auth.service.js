const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { generateOtp, sendOtp: sendSms } = require('../../utils/sms');
const { sign, signRefresh, verify } = require('../../utils/jwt');
const { otp: otpCfg } = require('../../config');

const USER_SELECT = {
  id: true, phone: true, email: true,
  firstName: true, lastName: true, avatarUrl: true,
  workshops: {
    where: { isActive: true },
    select: {
      role: true,
      workshop: { select: { id: true, name: true, slug: true } },
    },
  },
};

// ── Admin: email + password ───────────────────────────────────────────────────

const adminLogin = async (email, password) => {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isActive: true },
    select: { ...USER_SELECT, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });

  const hasAdminAccess = user.workshops.some(
    (wu) => ['WORKSHOP_ADMIN', 'TECHNICIAN'].includes(wu.role)
  );
  if (!hasAdminAccess) {
    throw Object.assign(new Error('Sin acceso al panel de administración'), { status: 403 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { passwordHash: _omit, ...safeUser } = user;
  return {
    accessToken: sign({ userId: user.id }),
    refreshToken: signRefresh({ userId: user.id }),
    user: safeUser,
  };
};

// ── Mobile: OTP (customers only) ─────────────────────────────────────────────

const requestOtp = async (phone) => {
  const customer = await prisma.customer.findFirst({
    where: { phone, isActive: true },
  });
  if (!customer) {
    throw Object.assign(
      new Error('Número no registrado. Contacta al taller para que te den acceso.'),
      { status: 404 }
    );
  }

  await prisma.otpCode.deleteMany({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + otpCfg.expiresMinutes * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });
  await sendSms(phone, code);
};

const validateOtp = async (phone, code) => {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) throw Object.assign(new Error('Código no encontrado o expirado'), { status: 400 });

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  });

  if (otp.attempts + 1 >= otpCfg.maxAttempts) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    throw Object.assign(new Error('Demasiados intentos fallidos'), { status: 429 });
  }

  if (otp.code !== code) throw Object.assign(new Error('Código incorrecto'), { status: 400 });

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  // Find the customer record to get workshopId + customerId
  const customer = await prisma.customer.findFirst({
    where: { phone, isActive: true },
    select: { id: true, workshopId: true, firstName: true, lastName: true },
  });

  // Upsert the linked user account
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        firstName: customer?.firstName || 'Cliente',
        lastName: customer?.lastName || '',
      },
    });
  }

  // Link customer → user if not linked yet
  if (customer && !customer.userId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { userId: user.id },
    }).catch(() => {});
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });

  return {
    accessToken: sign({ userId: user.id }),
    refreshToken: signRefresh({ userId: user.id }),
    user: fullUser,
    customerId: customer?.id || null,
    workshopId: customer?.workshopId || null,
  };
};

// ── Refresh ───────────────────────────────────────────────────────────────────

const refreshAccessToken = async (token) => {
  try {
    const payload = verify(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new Error('Usuario inactivo');
    return { accessToken: sign({ userId: user.id }) };
  } catch {
    throw Object.assign(new Error('Token de refresco inválido'), { status: 401 });
  }
};

// ── Admin: first-time setup OTP (no customer check) ─────────────────────────

const requestAdminSetupOtp = async (phone) => {
  await prisma.otpCode.deleteMany({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
  });
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + otpCfg.expiresMinutes * 60 * 1000);
  await prisma.otpCode.create({ data: { phone, code, expiresAt } });
  await sendSms(phone, code);
};

const validateAdminSetupOtp = async (phone, code) => {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) throw Object.assign(new Error('Código no encontrado o expirado'), { status: 400 });

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  });

  if (otp.attempts + 1 >= otpCfg.maxAttempts) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    throw Object.assign(new Error('Demasiados intentos fallidos'), { status: 429 });
  }

  if (otp.code !== code) throw Object.assign(new Error('Código incorrecto'), { status: 400 });

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone, firstName: 'Admin', lastName: '' },
    });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });

  return {
    accessToken: sign({ userId: user.id }),
    refreshToken: signRefresh({ userId: user.id }),
    user: fullUser,
  };
};

module.exports = { adminLogin, requestAdminSetupOtp, validateAdminSetupOtp, requestOtp, validateOtp, refreshAccessToken };
