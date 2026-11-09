const prisma = require('../../config/database');
const { ok, created, notFound } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { z, pick, CUSTOMER_PUBLIC } = require('../../utils/guards');

const FIELDS = ['firstName', 'lastName', 'phone', 'email', 'address', 'notes'];

const emptyToUndef = (v) => (v === '' || v === null ? undefined : v);
const createSchema = z.object({
  firstName: z.string().trim().min(1, 'Requerido'),
  lastName: z.string().trim().min(1, 'Requerido'),
  phone: z.string().trim().regex(/^\+?\d{10,15}$/, 'Teléfono inválido'),
  email: z.preprocess(emptyToUndef, z.string().trim().email('Email inválido').optional()),
  address: z.preprocess(emptyToUndef, z.string().trim().optional()),
  notes: z.preprocess(emptyToUndef, z.string().trim().optional()),
});
const updateSchema = createSchema.partial();

const list = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { page, limit, skip } = parsePagination(req.query, 500);
    const search = req.query.search;

    const where = {
      workshopId,
      isActive: true,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
        // Los vehículos se eliminan de forma lógica (isActive=false): el contador solo cuenta los activos,
        // igual que la lista de vehículos del cliente.
        select: { ...CUSTOMER_PUBLIC, _count: { select: { vehicles: { where: { isActive: true } }, workOrders: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const data = createSchema.parse(pick(req.body, FIELDS));
    const customer = await prisma.customer.create({
      data: { workshopId: req.params.workshopId, ...data },
      select: CUSTOMER_PUBLIC,
    });
    created(res, customer);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, workshopId: req.params.workshopId },
      select: {
        ...CUSTOMER_PUBLIC,
        vehicles: { where: { isActive: true } },
        _count: { select: { workOrders: true, appointments: true } },
      },
    });
    if (!customer) return notFound(res);
    ok(res, customer);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, workshopId: req.params.workshopId },
      select: { id: true },
    });
    if (!customer) return notFound(res);

    const data = updateSchema.parse(pick(req.body, FIELDS));
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data,
      select: CUSTOMER_PUBLIC,
    });
    ok(res, updated);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.customer.updateMany({
      where: { id: req.params.customerId, workshopId: req.params.workshopId },
      data: { isActive: false },
    });
    ok(res, { message: 'Cliente desactivado' });
  } catch (e) { next(e); }
};

module.exports = { list, create, getOne, update, remove };
