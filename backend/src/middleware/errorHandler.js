const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Ya existe un registro con esos datos.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
  }
  if (err.name === 'ZodError') {
    return res.status(422).json({ success: false, message: 'Datos inválidos.', details: err.errors });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Error interno del servidor.' : err.message,
  });
};
