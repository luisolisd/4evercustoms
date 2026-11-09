const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config');

// Cada token lleva un "type" para que un refresh token no sirva como access token (ni al revés).
const sign = (payload) =>
  jwt.sign({ ...payload, type: 'access' }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

const signRefresh = (payload) =>
  jwt.sign({ ...payload, type: 'refresh' }, jwtConfig.secret, { expiresIn: jwtConfig.refreshExpiresIn });

const verify = (token, type = 'access') => {
  const payload = jwt.verify(token, jwtConfig.secret);
  if (payload.type !== type) throw new Error('Tipo de token inválido');
  return payload;
};

module.exports = { sign, signRefresh, verify };
