const crypto = require('crypto');
const { twilio: cfg } = require('../config');

// Código de 6 dígitos con CSPRNG
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

// El código se guarda hasheado (no en texto plano)
const hashOtp = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

let _client = null;
const getClient = () => {
  if (!_client) {
    const twilio = require('twilio');
    _client = twilio(cfg.accountSid, cfg.authToken);
  }
  return _client;
};

const sendOtp = async (phone, code) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV OTP] ${phone} → ${code}`);
    return;
  }
  await getClient().messages.create({
    body: `Tu código de verificación 4EVRcustoms es: ${code}. Válido por 10 minutos.`,
    from: cfg.phoneNumber,
    to: phone,
  });
};

module.exports = { generateOtp, hashOtp, sendOtp };
