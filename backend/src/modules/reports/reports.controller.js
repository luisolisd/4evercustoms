const prisma = require('../../config/database');
const { ok } = require('../../utils/response');

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
      lowStockCount,
    ] = await Promise.all([
      prisma.customer.count({ where: { workshopId: wid, isActive: true } }),
      prisma.vehicle.count({ where: { workshopId: wid, isActive: true } }),
      prisma.workOrder.count({ where: { workshopId: wid, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      prisma.workOrder.count({ where: { workshopId: wid, status: 'DELIVERED', deliveredAt: { gte: startOfMonth } } }),
      prisma.appointment.count({ where: { workshopId: wid, status: { in: ['PENDING', 'CONFIRMED'] } } }),
      prisma.workOrder.aggregate({
        where: { workshopId: wid, paymentStatus: 'PAID', updatedAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.inventory.count({
        where: { workshopId: wid },
      }),
    ]);

    ok(res, {
      totalCustomers,
      totalVehicles,
      activeOrders,
      completedThisMonth,
      pendingAppointments,
      revenueThisMonth: revenueThisMonth._sum.totalAmount || 0,
    });
  } catch (e) { next(e); }
};

const revenue = async (req, res, next) => {
  try {
    const wid = req.params.workshopId;
    const months = parseInt(req.query.months || '6', 10);

    const result = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "updatedAt") AS month,
        SUM("totalAmount") AS revenue,
        COUNT(*) AS orders
      FROM work_orders
      WHERE "workshopId" = ${wid}::uuid
        AND "paymentStatus" = 'PAID'
        AND "updatedAt" >= NOW() - (${months} || ' months')::interval
      GROUP BY DATE_TRUNC('month', "updatedAt")
      ORDER BY month ASC
    `;

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
    const result = await prisma.$queryRaw`
      SELECT "serviceType", COUNT(*) AS total
      FROM appointments
      WHERE "workshopId" = ${req.params.workshopId}::uuid
        AND status = 'COMPLETED'
      GROUP BY "serviceType"
      ORDER BY total DESC
      LIMIT 10
    `;
    ok(res, result);
  } catch (e) { next(e); }
};

module.exports = { summary, revenue, ordersByStatus, topServices };
