const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const fail = (status, message, details) =>
    res.status(status).json({ success: false, message, ...(details && { details }) });

  if (err.code === 'P2002') return fail(409, 'Ya existe un registro con esos datos.');
  if (err.code === 'P2025') return fail(404, 'Registro no encontrado.');
  if (err.code === 'P2003') return fail(409, 'No se puede completar: hay registros relacionados.');
  if (err.name === 'PrismaClientValidationError') return fail(400, 'Datos inválidos.');
  if (err.name === 'ZodError') {
    const first = err.issues?.[0];
    const msg = first ? `${first.path.join('.') || 'dato'}: ${first.message}` : 'Datos inválidos.';
    return fail(422, msg, err.issues);
  }
  if (err.name === 'MulterError') return fail(400, err.code === 'LIMIT_FILE_SIZE' ? 'La imagen excede 10 MB.' : 'Error al subir el archivo.');
  if (err.type === 'entity.too.large') return fail(413, 'La solicitud es demasiado grande.');
  if (err.type === 'entity.parse.failed') return fail(400, 'JSON inválido.');
  if (typeof err.message === 'string' && err.message.startsWith('CORS')) return fail(403, 'Origen no permitido.');

  const status = err.status || err.statusCode || 500;
  if (status >= 500) logger.error(err.message, { stack: err.stack, path: req.path });
  return fail(status, status === 500 ? 'Error interno del servidor.' : err.message);
};
