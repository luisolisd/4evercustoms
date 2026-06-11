const prisma = require('../../config/database');
const { forbidden } = require('../../utils/response');

// Carga el cliente vinculado al usuario autenticado y lo expone en req.customer.
// Bloquea (403) si el usuario no tiene una cuenta de cliente activa.
module.exports = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { userId: req.user.id, isActive: true },
      select: {
        id: true,
        workshopId: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        workshop: {
          select: { id: true, name: true, phone: true, address: true, city: true, state: true },
        },
      },
    });
    if (!customer) return forbidden(res, 'No tienes una cuenta de cliente activa.');
    req.customer = customer;
    next();
  } catch (e) { next(e); }
};
