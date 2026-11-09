const router = require('express').Router();
const { loginAdmin, customerStatus, setCustomerPassword, loginCustomer, sendOtp, verifyOtp, refreshToken, logout, getMe } = require('./auth.controller');
const authenticate = require('../../middleware/authenticate');
const { authLimiter, smsLimiter } = require('../../middleware/rateLimiters');

router.post('/admin/login', authLimiter, loginAdmin);
// Cliente: teléfono (10 dígitos) + contraseña propia
router.post('/customer/status', authLimiter, customerStatus);
router.post('/customer/set-password', authLimiter, setCustomerPassword);
router.post('/customer/login', authLimiter, loginCustomer);
router.post('/send-otp', smsLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
