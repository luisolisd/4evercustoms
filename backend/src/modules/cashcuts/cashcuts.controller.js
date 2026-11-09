const prisma = require('../../config/database');
const { ok, created } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { z, num, optionalStr, httpError } = require('../../utils/guards');

const METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

const toDate = (v, name) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError(`Fecha inválida: ${name}`, 400);
  return d;
};

const startOfTodayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Rango del corte: nunca se solapa con el corte anterior (evita contar un pago dos veces)
const resolveRange = async (workshopId, fromRaw, toRaw) => {
  const now = new Date();
  let to = toRaw ? toDate(toRaw, 'to') : now;
  if (to > now) to = now;
  let from = fromRaw ? toDate(fromRaw, 'from') : startOfTodayUtc();

  const last = await prisma.cashCut.findFirst({ where: { workshopId }, orderBy: { toAt: 'desc' }, select: { toAt: true } });
  let clamped = false;
  if (last && from < last.toAt) { from = last.toAt; clamped = true; }
  if (from >= to) throw httpError('No hay periodo por cortar: el último corte ya cubre hasta ahora.', 409);
  return { from, to, clamped, lastCutAt: last?.toAt || null };
};

const computeTotals = async (workshopId, from, to) => {
  const where = { workshopId, createdAt: { gt: from, lte: to } };
  const grouped = await prisma.payment.groupBy({ by: ['method'], where, _sum: { amount: true }, _count: { _all: true } });
  const totals = { CASH: 0, CARD: 0, TRANSFER: 0, OTHER: 0, total: 0, count: 0 };
  for (const g of grouped) {
    const amt = Number(g._sum.amount || 0);
    totals[g.method] = amt;
    totals.total += amt;
    totals.count += g._count._all;
  }
  return { totals, where };
};

const preview = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const range = await resolveRange(workshopId, req.query.from, req.query.to);
    const { totals, where } = await computeTotals(workshopId, range.from, range.to);

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { workOrder: { select: { orderNumber: true, customer: { select: { firstName: true, lastName: true } } } } },
    });
    const userIds = [...new Set(payments.map((p) => p.receivedById).filter(Boolean))];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const names = Object.fromEntries(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

    ok(res, {
      ...range,
      totals,
      payments: payments.map((p) => ({ ...p, receivedByName: names[p.receivedById] || null })),
    });
  } catch (e) { next(e); }
};

const createSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  countedCash: num.min(0).optional(),
  notes: optionalStr,
});

// Cierra el periodo: guarda una foto fija de los totales (no se puede modificar después)
const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const body = createSchema.parse({
      ...req.body,
      countedCash: req.body.countedCash === '' || req.body.countedCash === null ? undefined : req.body.countedCash,
    });
    const range = await resolveRange(workshopId, body.from, body.to);
    const { totals } = await computeTotals(workshopId, range.from, range.to);

    const cut = await prisma.cashCut.create({
      data: {
        workshopId,
        fromAt: range.from,
        toAt: range.to,
        totals,
        countedCash: body.countedCash ?? null,
        difference: body.countedCash !== undefined ? Math.round((body.countedCash - totals.CASH) * 100) / 100 : null,
        notes: body.notes,
        closedById: req.user.id,
        closedByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      },
    });
    created(res, cut);
  } catch (e) { next(e); }
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      prisma.cashCut.findMany({ where: { workshopId }, orderBy: { toAt: 'desc' }, skip, take: limit }),
      prisma.cashCut.count({ where: { workshopId } }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

module.exports = { preview, create, list, METHODS };
