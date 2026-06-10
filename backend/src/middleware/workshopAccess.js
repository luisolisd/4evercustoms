const prisma = require('../config/database');
const { forbidden, notFound } = require('../utils/response');

/**
 * Verifies the authenticated user belongs to the workshop in the URL param.
 * Attaches req.workshopUser and req.workshop.
 * @param {...string} allowedRoles - If empty, any active member is allowed.
 */
const workshopAccess = (...allowedRoles) =>
  async (req, res, next) => {
    const { workshopId } = req.params;

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { id: true, name: true, isActive: true },
    });

    if (!workshop || !workshop.isActive) return notFound(res, 'Taller no encontrado');

    const workshopUser = await prisma.workshopUser.findUnique({
      where: { workshopId_userId: { workshopId, userId: req.user.id } },
      select: { id: true, role: true, isActive: true },
    });

    if (!workshopUser || !workshopUser.isActive) return forbidden(res);

    if (allowedRoles.length && !allowedRoles.includes(workshopUser.role)) {
      return forbidden(res, 'Rol insuficiente para esta operación');
    }

    req.workshop = workshop;
    req.workshopUser = workshopUser;
    next();
  };

module.exports = { workshopAccess };
