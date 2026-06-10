const prisma = require('../../config/database');
const { ok, created, notFound } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');

const generateQuoteNumber = async (workshopId) => {
  const count = await prisma.quote.count({ where: { workshopId } });
  return `COT-${String(count + 1).padStart(5, '0')}`;
};

const recalcTotals = async (quoteId) => {
  const items = await prisma.quoteItem.findMany({ where: { quoteId } });
  const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
  const tax = subtotal * 0.16;
  await prisma.quote.update({
    where: { id: quoteId },
    data: { subtotal, tax, total: subtotal + tax },
  });
};

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { status, customerId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const where = { workshopId, ...(status && { status }), ...(customerId && { customerId }) };
    const [data, total] = await Promise.all([
      prisma.quote.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.quote.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const quoteNumber = await generateQuoteNumber(workshopId);
    const quote = await prisma.quote.create({
      data: { workshopId, quoteNumber, ...req.body },
    });
    created(res, quote);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, workshopId: req.params.workshopId },
      include: { items: { include: { part: true } }, customer: true, workOrder: true },
    });
    if (!quote) return notFound(res);
    ok(res, quote);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, workshopId: req.params.workshopId },
    });
    if (!quote) return notFound(res);
    const allowed = ['notes', 'validUntil', 'workOrderId'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    ok(res, await prisma.quote.update({ where: { id: quote.id }, data }));
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.quoteId, workshopId: req.params.workshopId },
    });
    if (!quote) return notFound(res);

    const data = { status };
    if (status === 'APPROVED') data.approvedAt = new Date();
    if (status === 'REJECTED') { data.rejectedAt = new Date(); data.rejectionReason = rejectionReason; }

    ok(res, await prisma.quote.update({ where: { id: quote.id }, data }));
  } catch (e) { next(e); }
};

const addItem = async (req, res, next) => {
  try {
    const { description, partId, quantity, unitPrice, isLabor } = req.body;
    const item = await prisma.quoteItem.create({
      data: {
        quoteId: req.params.quoteId,
        description,
        partId: partId || null,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        isLabor: isLabor || false,
      },
    });
    await recalcTotals(req.params.quoteId);
    ok(res, item, 201);
  } catch (e) { next(e); }
};

const removeItem = async (req, res, next) => {
  try {
    await prisma.quoteItem.delete({ where: { id: req.params.itemId } });
    await recalcTotals(req.params.quoteId);
    ok(res, { message: 'Item eliminado' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, updateStatus, addItem, removeItem };
