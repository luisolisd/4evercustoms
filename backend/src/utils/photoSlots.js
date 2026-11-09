const prisma = require('../config/database');
const { httpError } = require('./guards');

// Lista base (completa pero breve). El taller puede agregar más desde el catálogo.
const DEFAULT_TEMPLATES = [
  'Frente del vehículo',
  'Parte trasera',
  'Lateral izquierdo',
  'Lateral derecho',
  'Tablero / kilometraje',
  'Interior',
  'Cajuela',
  'Motor (vista general)',
  'Aceite de motor',
  'Filtro de aceite',
  'Filtro de aire',
  'Filtro de cabina',
  'Bujías',
  'Batería',
  'Anticongelante',
  'Líquido de frenos',
  'Frenos delanteros',
  'Frenos traseros',
  'Neumáticos',
  'Suspensión',
  'Escape',
  'Luces',
  'Daño o fuga detectada',
];

// Crea el catálogo base la primera vez que el taller lo consulta
async function ensureTemplates(workshopId) {
  const count = await prisma.photoTemplate.count({ where: { workshopId } });
  if (count > 0) return;
  await prisma.photoTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((label, i) => ({ workshopId, label, sortOrder: i })),
    skipDuplicates: true,
  });
}

// templateIds: ids del catálogo del taller · custom: textos libres ("Otro: especificar")
// Devuelve las etiquetas solicitadas, ya validadas y sin duplicados.
async function resolveSlotLabels(workshopId, { templateIds = [], custom = [] } = {}) {
  if (!Array.isArray(templateIds) || !Array.isArray(custom)) throw httpError('Fotos requeridas inválidas', 400);
  const templates = templateIds.length
    ? await prisma.photoTemplate.findMany({ where: { id: { in: templateIds.map(String) }, workshopId, isActive: true } })
    : [];
  if (templates.length !== new Set(templateIds).size) throw httpError('Alguna foto del catálogo no es válida', 400);

  const extra = custom
    .map((c) => String(c || '').trim().slice(0, 80))
    .filter(Boolean);
  const labels = [...templates.map((t) => t.label), ...extra];
  return [...new Set(labels)];
}

// Agrega al pedido las fotos solicitadas que aún no existan
async function addSlotsToOrder(workshopId, orderId, spec) {
  const labels = await resolveSlotLabels(workshopId, spec);
  if (!labels.length) return [];
  const existing = await prisma.orderPhotoSlot.findMany({ where: { workOrderId: orderId }, select: { label: true } });
  const have = new Set(existing.map((s) => s.label));
  const fresh = labels.filter((l) => !have.has(l));
  if (fresh.length) {
    await prisma.orderPhotoSlot.createMany({ data: fresh.map((label) => ({ workOrderId: orderId, label })) });
  }
  return fresh;
}

module.exports = { DEFAULT_TEMPLATES, ensureTemplates, resolveSlotLabels, addSlotsToOrder };
