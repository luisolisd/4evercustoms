// Limpia el body antes de pasarlo a Prisma:
// - omite strings vacíos, null/undefined y NaN (para que Prisma use defaults / no truene)
// - convierte los campos de fecha (incluidos los de <input datetime-local/date>) a Date
function cleanData(body = {}, dateFields = []) {
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value === 'number' && Number.isNaN(value)) continue;
    if (dateFields.includes(key)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) out[key] = d;
      continue;
    }
    out[key] = value;
  }
  return out;
}

module.exports = { cleanData };
