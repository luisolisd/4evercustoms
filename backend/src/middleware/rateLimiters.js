const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// Login / contraseñas: frena fuerza bruta por IP
const authLimiter = make(15 * 60 * 1000, 20, 'Demasiados intentos. Intenta de nuevo en unos minutos.');

// Envío de SMS (cuesta dinero y se puede abusar)
const smsLimiter = make(60 * 60 * 1000, 5, 'Demasiados códigos solicitados. Intenta más tarde.');

module.exports = { authLimiter, smsLimiter };
