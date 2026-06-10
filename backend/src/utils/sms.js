const { twilio: cfg } = require('../config');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

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

module.exports = { generateOtp, sendOtp };
