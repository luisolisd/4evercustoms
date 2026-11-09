const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { z, pick, num, optionalStr, httpError } = require('../../utils/guards');

const partSchema = z.object({
  name: z.string().trim().min(1, 'Requerido').max(200),
  sku: optionalStr,
  brand: optionalStr,
  description: optionalStr,
  unitPrice: num.min(0, 'El precio no puede ser negativo'),
});

const stockSchema = z.object({
  initialQuantity: num.min(0).default(0),
  minQuantity: num.min(0).default(0),
  location: optionalStr,
});

const num0 = (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : v);

// IDs de inventario con existencia <= mínimo (comparación entre columnas: requiere SQL)
const lowStockIds = async (workshopId) => {
  const rows = await prisma.$queryRaw`
    SELECT id FROM inventory WHERE "workshopId" = ${workshopId} AND quantity <= "minQuantity"
  `;
  return rows.map((r) => r.id);
};

const listParts = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { search } = req.query;
    const { page, limit, skip } = parsePagination(req.query, 500);

    const where = {
      workshopId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.part.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: { inventory: { select: { quantity: true, minQuantity: true, location: true } } },
      }),
      prisma.part.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const createPart = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const partData = partSchema.parse(pick(req.body, ['name', 'sku', 'brand', 'description', 'unitPrice']));
    const stock = stockSchema.parse({
      initialQuantity: num0(req.body.initialQuantity),
      minQuantity: num0(req.body.minQuantity),
      location: req.body.location,
    });

    const part = await prisma.$transaction(async (tx) => {
      const p = await tx.part.create({ data: { workshopId, ...partData } });
      await tx.inventory.create({
        data: {
          workshopId, partId: p.id,
          quantity: stock.initialQuantity, minQuantity: stock.minQuantity, location: stock.location,
        },
      });
      return p;
    });

    created(res, part);
  } catch (e) { next(e); }
};

const updatePart = async (req, res, next) => {
  try {
    const part = await prisma.part.findFirst({
      where: { id: req.params.partId, workshopId: req.params.workshopId },
    });
    if (!part) return notFound(res);

    const data = partSchema.partial().parse(pick(req.body, ['name', 'sku', 'brand', 'description', 'unitPrice']));
    const stock = z
      .object({ minQuantity: num.min(0).optional(), location: optionalStr })
      .parse({ minQuantity: num0(req.body.minQuantity), location: req.body.location });

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.part.update({ where: { id: part.id }, data });
      if (stock.minQuantity !== undefined || stock.location !== undefined) {
        await tx.inventory.updateMany({
          where: { partId: part.id },
          data: {
            ...(stock.minQuantity !== undefined && { minQuantity: stock.minQuantity }),
            ...(stock.location !== undefined && { location: stock.location }),
          },
        });
      }
      return p;
    });
    ok(res, updated);
  } catch (e) { next(e); }
};

const deletePart = async (req, res, next) => {
  try {
    await prisma.part.updateMany({
      where: { id: req.params.partId, workshopId: req.params.workshopId },
      data: { isActive: false },
    });
    ok(res, { message: 'Refacción desactivada' });
  } catch (e) { next(e); }
};

const listInventory = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { search, lowStock } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = {
      workshopId,
      part: {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      ...(lowStock === 'true' && { id: { in: await lowStockIds(workshopId) } }),
    };
    const [data, total] = await Promise.all([
      prisma.inventory.findMany({
        where, skip, take: limit,
        include: { part: true },
        orderBy: { part: { name: 'asc' } },
      }),
      prisma.inventory.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const movementSchema = z.object({
  inventoryId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: num,
  reason: optionalStr,
  reference: optionalStr,
});

// IN suma, OUT resta (sin dejar stock negativo) y ADJUSTMENT fija la existencia al conteo indicado.
const addMovement = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const body = movementSchema.parse(req.body);
    if (body.type === 'ADJUSTMENT' ? body.quantity < 0 : body.quantity <= 0) {
      return error(res, body.type === 'ADJUSTMENT' ? 'El conteo no puede ser negativo' : 'La cantidad debe ser mayor a 0');
    }

    const movement = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findFirst({ where: { id: body.inventoryId, workshopId } });
      if (!inv) throw httpError('Inventario no encontrado', 404);

      if (body.type === 'IN') {
        await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: body.quantity } } });
      } else if (body.type === 'OUT') {
        // Condición en el UPDATE: evita stock negativo aun con peticiones simultáneas
        const r = await tx.inventory.updateMany({
          where: { id: inv.id, quantity: { gte: body.quantity } },
          data: { quantity: { decrement: body.quantity } },
        });
        if (r.count === 0) throw httpError('Stock insuficiente', 400);
      } else {
        await tx.inventory.update({ where: { id: inv.id }, data: { quantity: body.quantity } });
      }

      return tx.inventoryMovement.create({
        data: {
          inventoryId: inv.id, type: body.type, quantity: body.quantity,
          reason: body.reason, reference: body.reference, performedBy: req.user.id,
        },
      });
    });

    ok(res, movement, 201);
  } catch (e) { next(e); }
};

const lowStock = async (req, res, next) => {
  try {
    const ids = await lowStockIds(req.params.workshopId);
    const items = await prisma.inventory.findMany({
      where: { id: { in: ids }, part: { isActive: true } },
      include: { part: true },
    });
    ok(res, items);
  } catch (e) { next(e); }
};

module.exports = { listParts, createPart, updatePart, deletePart, listInventory, addMovement, lowStock };
