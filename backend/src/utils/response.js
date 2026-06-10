const ok = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const created = (res, data) => ok(res, data, 201);

const noContent = (res) => res.status(204).send();

const error = (res, message, statusCode = 400, details = null) =>
  res.status(statusCode).json({ success: false, message, ...(details && { details }) });

const notFound = (res, message = 'Recurso no encontrado') => error(res, message, 404);

const unauthorized = (res, message = 'No autorizado') => error(res, message, 401);

const forbidden = (res, message = 'Acceso denegado') => error(res, message, 403);

const paginate = (res, { data, total, page, limit }) =>
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });

module.exports = { ok, created, noContent, error, notFound, unauthorized, forbidden, paginate };
