const { error } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    return error(res, 'Datos inválidos', 422, result.error.errors);
  }

  req.validated = result.data;
  next();
};

module.exports = { validate };
