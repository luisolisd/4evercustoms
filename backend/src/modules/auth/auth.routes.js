const router = require('express').Router();
const { loginAdmin, customerStatus, setCustomerPassword, loginCustomer, sendAdminSetupOtp, verifyAdminSetupOtp, sendOtp, verifyOtp, refreshToken, logout, getMe } = require('./auth.controller');
const authenticate = require('../../middleware/authenticate');

router.post('/admin/login', loginAdmin);
router.post('/admin/setup-otp', sendAdminSetupOtp);
router.post('/admin/verify-setup-otp', verifyAdminSetupOtp);
// Cliente: teléfono (10 dígitos) + contraseña propia
router.post('/customer/status', customerStatus);
router.post('/customer/set-password', setCustomerPassword);
router.post('/customer/login', loginCustomer);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
