const prisma = require('../../config/database');
const { ok } = require('../../utils/response');

const clampInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : Math.min(max, Math.max(min, n));
};

const summary = async (req, res, next) => {
  try {
    const wid = req.params.workshopId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      totalVehicles,
      activeOrders,
      completedThisMonth,
      pendingAppointments,
      revenueThisMonth,
    ] = await Promise.all([
      prisma.customer.count({ where: { workshopId: wid, isActive: true } }),
      prisma.vehicle.count({ where: { workshopId: wid, isActive: true } }),
      prisma.workOrder.count({ where: { workshopId: wid, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      prisma.workOrder.count({ where: { workshopId: wid, status: 'DELIVERED', deliveredAt: { gte: startOfMonth } } }),
      prisma.appointment.count({ where: { workshopId: wid, status: { in: ['PENDING', 'CONFIRMED'] } } }),
      prisma.payment.aggregate({
        where: { workshopId: wid, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    ok(res, {
      totalCustomers,
      totalVehicles,
      activeOrders,
      completedThisMonth,
      pendingAppointments,
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (e) { next(e); }
};

// Ingresos = pagos recibidos (tabla payments), por fecha de cobro. ?days=N → últimos N días (por día si N<=31, por mes si no).
// ?months=N → últimos N meses agrupados por mes. Por defecto: 6 meses.
const revenue = async (req, res, next) => {
  try {
    const wid = req.params.workshopId;
    let since;
    let unit = 'month';
    if (req.query.days) {
      const days = clampInt(req.query.days, 30, 1, 366);
      since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      unit = days <= 31 ? 'day' : 'month';
    } else {
      const months = clampInt(req.query.months, 6, 1, 36);
      since = new Date();
      since.setMonth(since.getMonth() - months);
    }

    const result =
      unit === 'day'
        ? await prisma.$queryRaw`
            SELECT DATE_TRUNC('day', "createdAt") AS month,
                   COALESCE(SUM(amount), 0)::float8 AS revenue,
                   COUNT(*)::int AS orders
            FROM payments
            WHERE "workshopId" = ${wid} AND "createdAt" >= ${since}
            GROUP BY 1 ORDER BY 1 ASC`
        : await prisma.$queryRaw`
            SELECT DATE_TRUNC('month', "createdAt") AS month,
                   COALESCE(SUM(amount), 0)::float8 AS revenue,
                   COUNT(*)::int AS orders
            FROM payments
            WHERE "workshopId" = ${wid} AND "createdAt" >= ${since}
            GROUP BY 1 ORDER BY 1 ASC`;

    ok(res, result);
  } catch (e) { next(e); }
};

const ordersByStatus = async (req, res, next) => {
  try {
    const result = await prisma.workOrder.groupBy({
      by: ['status'],
      where: { workshopId: req.params.workshopId },
      _count: { status: true },
    });
    ok(res, result.map((r) => ({ status: r.status, count: r._count.status })));
  } catch (e) { next(e); }
};

const topServices = async (req, res, next) => {
  try {
    const days = clampInt(req.query.days, 36500, 1, 36500);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.$queryRaw`
      SELECT "serviceType", COUNT(*)::int AS total
      FROM appointments
      WHERE "workshopId" = ${req.params.workshopId}
        AND status = 'COMPLETED'
        AND "scheduledAt" >= ${since}
      GROUP BY "serviceType"
      ORDER BY total DESC
      LIMIT 10
    `;
    ok(res, result);
  } catch (e) { next(e); }
};

module.exports = { summary, revenue, ordersByStatus, topServices };
