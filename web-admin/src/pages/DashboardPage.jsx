import { useQuery } from '@tanstack/react-query';
import { Users, Car, ClipboardList, CalendarDays, DollarSign, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import StatsCard from '../components/ui/StatsCard';
import { getWorkshopStats, getRevenue, getOrdersByStatus, getTopServices } from '../services/reports';
import { getLowStock } from '../services/inventory';
import { fMoney, fDate } from '../utils/formatters';
import { WorkOrderBadge } from '../components/ui/Badge';
import { getWorkOrders } from '../services/workOrders';
import { getAppointments } from '../services/appointments';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const PIE_COLORS = ['#6b7280','#3b82f6','#f59e0b','#ea580c','#8b5cf6','#22c55e','#14b8a6','#ef4444'];

export default function DashboardPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const wid = workshopId;

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['stats', wid],
    queryFn: () => getWorkshopStats(wid).then((r) => r.data),
    enabled: !!wid,
  });

  const { data: revenue } = useQuery({
    queryKey: ['revenue', wid],
    queryFn: () => getRevenue(wid, 6).then((r) => r.data),
    enabled: !!wid,
  });

  const { data: byStatus } = useQuery({
    queryKey: ['orders-by-status', wid],
    queryFn: () => getOrdersByStatus(wid).then((r) => r.data),
    enabled: !!wid,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders', wid],
    queryFn: () => getWorkOrders(wid, { limit: 5 }).then((r) => r.data),
    enabled: !!wid,
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ['today-appointments', wid],
    queryFn: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tom = new Date(today); tom.setDate(tom.getDate() + 1);
      return getAppointments(wid, { from: today.toISOString(), to: tom.toISOString(), limit: 10 }).then((r) => r.data);
    },
    enabled: !!wid,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock', wid],
    queryFn: () => getLowStock(wid).then((r) => r.data),
    enabled: !!wid,
  });

  const revenueChart = (revenue || []).map((r) => ({
    mes: format(parseISO(String(r.month)), 'MMM', { locale: es }),
    ingresos: Number(r.revenue || 0),
  }));

  const pieData = (byStatus || []).map((r) => ({
    name: r.status,
    value: Number(r.count),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de operaciones del taller</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard icon={Users}         color="blue"   label="Total clientes"     value={stats?.customers}          loading={loadingStats} />
        <StatsCard icon={ClipboardList} color="brand"  label="Órdenes activas"    value={stats?.activeOrders}       loading={loadingStats} />
        <StatsCard icon={CalendarDays}  color="purple" label="Citas pendientes"   value={stats?.pendingAppointments} loading={loadingStats} />
        <StatsCard icon={DollarSign}    color="green"  label="Ingresos del mes"   value={stats ? fMoney(stats.totalRevenue) : null} loading={loadingStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-6">Ingresos últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueChart} barSize={28}>
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [fMoney(v), 'Ingresos']} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="ingresos" fill="#ea580c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Estado de órdenes</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's appointments */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Citas de hoy</h2>
          {!todayAppointments?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hay citas para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.customer?.firstName} {a.customer?.lastName}</p>
                    <p className="text-xs text-gray-500">{a.serviceType} · {a.vehicle?.make} {a.vehicle?.model}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {format(parseISO(String(a.scheduledAt)), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Órdenes recientes</h2>
          {!recentOrders?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hay órdenes</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500 truncate">{o.customer?.firstName} {o.customer?.lastName} · {o.vehicle?.make} {o.vehicle?.model}</p>
                  </div>
                  <WorkOrderBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">Stock bajo en {lowStock.length} refacción(es)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lowStock.slice(0, 8).map((i) => (
              <div key={i.id} className="bg-white rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900 truncate">{i.part?.name}</p>
                <p className="text-amber-700 font-bold">{Number(i.quantity)} unidades</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
