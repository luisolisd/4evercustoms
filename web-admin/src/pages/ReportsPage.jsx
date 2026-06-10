import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getReports } from '../services/reports';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import { fMoney, fNumber } from '../utils/formatters';
import { TrendingUp, DollarSign, ClipboardList, Users } from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#ea580c', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#6b7280'];

const RANGES = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const STATUS_LABELS = {
  RECEIVED: 'Recibido', DIAGNOSIS: 'Diagnóstico', AWAITING_AUTH: 'Esp. autorización',
  IN_REPAIR: 'En reparación', FINAL_TESTING: 'Pruebas finales',
  READY_FOR_PICKUP: 'Listo', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

function StatCard({ label, value, icon: Icon, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    blue:  'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple:'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={clsx('p-2.5 rounded-xl', colors[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const [range, setRange] = useState('30');

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['report-summary', workshopId, range],
    queryFn: () => getReports(workshopId, 'summary', { days: range }),
    enabled: !!workshopId,
  });

  const { data: revenue } = useQuery({
    queryKey: ['report-revenue', workshopId, range],
    queryFn: () => getReports(workshopId, 'revenue', { days: range }),
    enabled: !!workshopId,
  });

  const { data: byStatus } = useQuery({
    queryKey: ['report-by-status', workshopId],
    queryFn: () => getReports(workshopId, 'orders-by-status'),
    enabled: !!workshopId,
  });

  const { data: topServices } = useQuery({
    queryKey: ['report-services', workshopId, range],
    queryFn: () => getReports(workshopId, 'top-services', { days: range }),
    enabled: !!workshopId,
  });

  const s = summary?.data || {};

  const pieData = (byStatus?.data || []).map((d) => ({
    ...d,
    name: STATUS_LABELS[d.status] || d.status,
  }));

  const revenueData = (revenue?.data || []).map((d) => ({
    ...d,
    total: Number(d.revenue || d.total || 0),
    fecha: d.month
      ? new Date(d.month).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
      : (d.date ? new Date(d.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : ''),
  }));

  const serviceData = (topServices?.data || []).map((d) => ({
    ...d,
    service: d.service_type || d.serviceType,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas del taller</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                range === r.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ingresos del mes" value={sumLoading ? '—' : fMoney(s.revenueThisMonth || 0)} icon={DollarSign} color="green" />
        <StatCard label="Órdenes del mes" value={sumLoading ? '—' : fNumber(s.completedThisMonth || 0)} icon={ClipboardList} color="brand" />
        <StatCard label="Total clientes" value={sumLoading ? '—' : fNumber(s.totalCustomers || 0)} icon={Users} color="blue" />
        <StatCard label="Órdenes activas" value={sumLoading ? '—' : fNumber(s.activeOrders || 0)} icon={TrendingUp} color="purple" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-5">Ingresos en el período</h2>
        {revenueData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos para este período</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fMoney(v)} />
              <Area type="monotone" dataKey="total" stroke="#ea580c" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-5">Órdenes por estado</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3} label={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Tooltip formatter={(v, name) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top services */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-5">Servicios más solicitados</h2>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={serviceData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#ea580c" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
