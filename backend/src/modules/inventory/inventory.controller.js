const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

const listParts = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = {
      workshopId,
      isActive: true,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
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
    const { initialQuantity = 0, minQuantity = 0, location, ...partData } = req.body;

    const part = await prisma.$transaction(async (tx) => {
      const p = await tx.part.create({ data: { workshopId, ...partData } });
      await tx.inventory.create({
        data: { workshopId, partId: p.id, quantity: initialQuantity, minQuantity, location },
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

    const allowed = ['name', 'description', 'brand', 'unitPrice', 'sku'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    ok(res, await prisma.part.update({ where: { id: part.id }, data }));
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
    const { page, limit, skip } = parsePagination(req.query);

    const where = { workshopId, part: { isActive: true } };
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

const addMovement = async (req, res, next) => {
  try {
    const { inventoryId, type, quantity, reason, reference } = req.body;

    const inv = await prisma.inventory.findFirst({
      where: { id: inventoryId, workshopId: req.params.workshopId },
    });
    if (!inv) return notFound(res, 'Inventario no encontrado');
    if (type === 'OUT' && Number(inv.quantity) < quantity) {
      return error(res, 'Stock insuficiente');
    }

    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: { inventoryId, type, quantity, reason, reference, performedBy: req.user.id },
      }),
      prisma.inventory.update({
        where: { id: inventoryId },
        data: { quantity: { [type === 'IN' ? 'increment' : 'decrement']: quantity } },
      }),
    ]);

    ok(res, movement, 201);
  } catch (e) { next(e); }
};

const lowStock = async (req, res, next) => {
  try {
    const items = await prisma.inventory.findMany({
      where: {
        workshopId: req.params.workshopId,
        part: { isActive: true },
      },
      include: { part: true },
    });
    const low = items.filter((i) => Number(i.quantity) <= Number(i.minQuantity));
    ok(res, low);
  } catch (e) { next(e); }
};

module.exports = { listParts, createPart, updatePart, deletePart, listInventory, addMovement, lowStock };
