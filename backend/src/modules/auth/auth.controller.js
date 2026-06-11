const { adminLogin, customerAuthStatus, customerSetPassword, customerLogin, requestAdminSetupOtp, validateAdminSetupOtp, requestOtp, validateOtp, refreshAccessToken } = require('./auth.service');
const { ok, error } = require('../../utils/response');
const prisma = require('../../config/database');

const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email y contraseña son requeridos');
    const result = await adminLogin(email, password);
    ok(res, result);
  } catch (e) { next(e); }
};

// ── Cliente: teléfono + contraseña ──────────────────────────────────────────
const customerStatus = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return error(res, 'El teléfono es requerido');
    const result = await customerAuthStatus(phone);
    ok(res, result);
  } catch (e) { next(e); }
};

const setCustomerPassword = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return error(res, 'Teléfono y contraseña son requeridos');
    const result = await customerSetPassword(phone, password);
    ok(res, result);
  } catch (e) { next(e); }
};

const loginCustomer = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return error(res, 'Teléfono y contraseña son requeridos');
    const result = await customerLogin(phone, password);
    ok(res, result);
  } catch (e) { next(e); }
};

const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return error(res, 'El teléfono es requerido');
    await requestOtp(phone);
    ok(res, { message: 'Código enviado' });
  } catch (e) { next(e); }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return error(res, 'Teléfono y código son requeridos');
    const result = await validateOtp(phone, code);
    ok(res, result);
  } catch (e) { next(e); }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, 'Token de refresco requerido');
    const result = await refreshAccessToken(token);
    ok(res, result);
  } catch (e) { next(e); }
};

const logout = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { fcmToken: null },
    });
    ok(res, { message: 'Sesión cerrada' });
  } catch (e) { next(e); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, phone: true, email: true,
        firstName: true, lastName: true, avatarUrl: true,
        workshops: {
          select: {
            role: true,
            workshop: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    // Si es cliente, adjunta customerId + workshopId desde su registro de cliente
    const customer = await prisma.customer.findFirst({
      where: { userId: req.user.id, isActive: true },
      select: { id: true, workshopId: true },
    });
    ok(res, {
      ...user,
      customerId: customer?.id || null,
      workshopId: customer?.workshopId || user?.workshops?.[0]?.workshop?.id || null,
    });
  } catch (e) { next(e); }
};

const sendAdminSetupOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return error(res, 'El teléfono es requerido');
    await requestAdminSetupOtp(phone);
    ok(res, { message: 'Código enviado' });
  } catch (e) { next(e); }
};

const verifyAdminSetupOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return error(res, 'Teléfono y código son requeridos');
    const result = await validateAdminSetupOtp(phone, code);
    ok(res, result);
  } catch (e) { next(e); }
};

module.exports = { loginAdmin, customerStatus, setCustomerPassword, loginCustomer, sendAdminSetupOtp, verifyAdminSetupOtp, sendOtp, verifyOtp, refreshToken, logout, getMe };
