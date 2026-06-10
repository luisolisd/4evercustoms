const { verify } = require('../utils/jwt');
const { unauthorized } = require('../utils/response');
const prisma = require('../config/database');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = authHeader.slice(7);
  try {
    const payload = verify(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, phone: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user || !user.isActive) return unauthorized(res);

    req.user = user;
    next();
  } catch {
    return unauthorized(res, 'Token inválido o expirado');
  }
};
