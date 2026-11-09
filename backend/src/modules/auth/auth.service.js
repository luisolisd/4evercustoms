const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { generateOtp, hashOtp, sendOtp: sendSms } = require('../../utils/sms');
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
    (wu) => ['WORKSHOP_ADMIN', 'SUPERVISOR', 'TECHNICIAN'].includes(wu.role)
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

// ── Mobile: phone + password (customers) ─────────────────────────────────────

// Normaliza a los últimos 10 dígitos (el cliente escribe su número sin +52)
const normalizePhone = (phone) => (phone || '').replace(/\D/g, '').slice(-10);

// Exige exactamente 10 dígitos: con menos, `endsWith` coincidiría con cualquier cliente.
const findCustomerByPhone = async (phone) => {
  const last10 = normalizePhone(phone);
  if (last10.length !== 10) return null;
  return prisma.customer.findFirst({
    where: { phone: { endsWith: last10 }, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
};

// Crea/vincula el User del cliente y emite los tokens (misma forma de sesión que el resto de la app)
const issueCustomerSession = async (customer) => {
  let user = await prisma.user.findUnique({ where: { phone: customer.phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone: customer.phone, firstName: customer.firstName, lastName: customer.lastName },
    });
  }
  if (!customer.userId) {
    await prisma.customer
      .update({ where: { id: customer.id }, data: { userId: user.id } })
      .catch(() => {});
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
  return {
    accessToken: sign({ userId: user.id }),
    refreshToken: signRefresh({ userId: user.id }),
    user: { ...fullUser, customerId: customer.id, workshopId: customer.workshopId },
    customerId: customer.id,
    workshopId: customer.workshopId,
  };
};

// Paso 1: el cliente escribe su número; le decimos si está registrado y si ya tiene contraseña
const customerAuthStatus = async (phone) => {
  const last10 = normalizePhone(phone);
  if (last10.length !== 10) {
    throw Object.assign(new Error('Ingresa un número válido de 10 dígitos'), { status: 400 });
  }
  const customer = await findCustomerByPhone(phone);
  if (!customer) return { registered: false, hasPassword: false };
  return { registered: true, hasPassword: !!customer.passwordHash };
};

// Paso 2a: primera vez → el cliente crea su propia contraseña (solo si el admin ya lo registró)
const customerSetPassword = async (phone, password) => {
  const customer = await findCustomerByPhone(phone);
  if (!customer) {
    throw Object.assign(
      new Error('Tu número no está registrado. Pide al taller que te dé de alta.'),
      { status: 404 }
    );
  }
  if (customer.passwordHash) {
    throw Object.assign(new Error('Ya tienes una contraseña. Inicia sesión.'), { status: 409 });
  }
  if (!password || password.length < 6) {
    throw Object.assign(new Error('La contraseña debe tener al menos 6 caracteres'), { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.customer.update({ where: { id: customer.id }, data: { passwordHash } });
  return issueCustomerSession({ ...customer, passwordHash });
};

// Paso 2b: ya tiene contraseña → inicia sesión
const customerLogin = async (phone, password) => {
  const customer = await findCustomerByPhone(phone);
  if (!customer || !customer.passwordHash) {
    throw Object.assign(new Error('Número o contraseña incorrectos'), { status: 401 });
  }
  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) throw Object.assign(new Error('Número o contraseña incorrectos'), { status: 401 });
  return issueCustomerSession(customer);
};

// ── OTP por SMS (clientes) ───────────────────────────────────────────────────

const requestOtp = async (phone) => {
  const customer = await findCustomerByPhone(phone);
  if (!customer) {
    throw Object.assign(
      new Error('Número no registrado. Contacta al taller para que te den acceso.'),
      { status: 404 }
    );
  }
  const target = customer.phone;

  await prisma.otpCode.deleteMany({ where: { phone: target, usedAt: null } });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + otpCfg.expiresMinutes * 60 * 1000);
  await prisma.otpCode.create({ data: { phone: target, code: hashOtp(code), expiresAt } });
  await sendSms(target, code);
};

const validateOtp = async (phone, code) => {
  const customer = await findCustomerByPhone(phone);
  if (!customer) throw Object.assign(new Error('Código no encontrado o expirado'), { status: 400 });

  const otp = await prisma.otpCode.findFirst({
    where: { phone: customer.phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw Object.assign(new Error('Código no encontrado o expirado'), { status: 400 });

  if (otp.attempts >= otpCfg.maxAttempts) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    throw Object.assign(new Error('Demasiados intentos fallidos'), { status: 429 });
  }

  if (otp.code !== hashOtp(code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw Object.assign(new Error('Código incorrecto'), { status: 400 });
  }

  // Consumo atómico: si dos peticiones llegan a la vez, solo una lo marca como usado
  const consumed = await prisma.otpCode.updateMany({
    where: { id: otp.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count === 0) throw Object.assign(new Error('Código no encontrado o expirado'), { status: 400 });

  return issueCustomerSession(customer);
};

// ── Refresh ───────────────────────────────────────────────────────────────────

const refreshAccessToken = async (token) => {
  try {
    const payload = verify(token, 'refresh');
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new Error('Usuario inactivo');
    return { accessToken: sign({ userId: user.id }) };
  } catch {
    throw Object.assign(new Error('Token de refresco inválido'), { status: 401 });
  }
};

module.exports = {
  adminLogin,
  customerAuthStatus,
  customerSetPassword,
  customerLogin,
  requestOtp,
  validateOtp,
  refreshAccessToken,
};
