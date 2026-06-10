const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config');

const sign = (payload) =>
  jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

const signRefresh = (payload) =>
  jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.refreshExpiresIn });

const verify = (token) => jwt.verify(token, jwtConfig.secret);

module.exports = { sign, signRefresh, verify };
