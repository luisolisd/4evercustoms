const prisma = require('../config/database');
const logger = require('./logger');

// Los teléfonos de usuarios se guardan con 10 dígitos (sin +52). Quita el prefijo a los que ya existían.
// Es idempotente: si no hay nada que corregir no hace nada; un número que ya tenga otro usuario se omite.
async function normalizeUserPhones() {
  const users = await prisma.user.findMany({
    where: { phone: { startsWith: '+' } },
    select: { id: true, phone: true },
  });
  let fixed = 0;
  for (const u of users) {
    const digits = u.phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) continue;
    try {
      await prisma.user.update({ where: { id: u.id }, data: { phone: digits } });
      fixed++;
    } catch (e) {
      logger.warn(`Teléfono de usuario ${u.id} no normalizado (${e.code || e.message})`);
    }
  }
  if (fixed) logger.info(`Teléfonos de usuarios normalizados a 10 dígitos: ${fixed}`);
}

module.exports = { normalizeUserPhones };
