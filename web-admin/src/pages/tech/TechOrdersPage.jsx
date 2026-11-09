import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Car, Camera, ClipboardList, ChevronRight, CalendarClock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getWorkOrders } from '../../services/workOrders';
import { getMyAppointments } from '../../services/appointments';
import { WorkOrderBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { fDate, fDateTime } from '../../utils/formatters';
import clsx from 'clsx';

const TABS = [
  { key: 'open', label: 'En curso' },
  { key: 'done', label: 'Terminadas' },
];

// Panel del técnico: solo las órdenes que tiene asignadas
export default function TechOrdersPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState('open');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tech-orders', workshopId],
    queryFn: () => getWorkOrders(workshopId, { limit: 100 }).then((r) => r.data),
    enabled: !!workshopId,
    refetchOnWindowFocus: true,
  });

  const { data: appts } = useQuery({
    queryKey: ['tech-appointments', workshopId],
    queryFn: () => getMyAppointments(workshopId).then((r) => r.data),
    enabled: !!workshopId,
    refetchOnWindowFocus: true,
  });
  const toEnter = appts || [];

  const all = data || [];
  const isDone = (o) => ['DELIVERED', 'CANCELLED'].includes(o.status);
  const rows = all.filter((o) => (tab === 'open' ? !isDone(o) : isDone(o)));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Mi trabajo</p>
          <h1 className="page-title">Hola, {user?.firstName}</h1>
          <p className="page-subtitle">{all.filter((o) => !isDone(o)).length} orden(es) asignada(s)</p>
        </div>
        <button onClick={() => refetch()} className="text-xs text-gray-500 underline">{isFetching ? 'Actualizando…' : 'Actualizar'}</button>
      </div>

      {toEnter.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Por ingresar · {toEnter.length}</p>
          {toEnter.map((a) => (
            <div key={a.id} className="card flex items-center gap-3 p-4 border-l-[3px] border-l-blue-500">
              <div className="p-2.5 bg-blue-50 rounded-xl shrink-0"><CalendarClock size={20} className="text-blue-600" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{fDateTime(a.scheduledAt)}</p>
                <p className="text-sm text-gray-700 truncate">{a.vehicle?.year} {a.vehicle?.make} {a.vehicle?.model}{a.vehicle?.licensePlate ? ` · ${a.vehicle.licensePlate}` : ''}</p>
                <p className="text-xs text-gray-500 truncate">{a.serviceType} · {a.customer?.firstName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title="Sin órdenes" description={tab === 'open' ? 'No tienes trabajos asignados por ahora.' : 'Aún no hay órdenes terminadas.'} /></div>
      ) : (
        <div className="space-y-3">
          {rows.map((o) => {
            const p = o.slotProgress || { total: 0, done: 0 };
            return (
              <Link key={o.id} to={`/mis-ordenes/${o.id}`} className="card flex items-center gap-3 p-4 hover:shadow-md transition">
                <div className="p-2.5 bg-gray-100 rounded-xl shrink-0"><Car size={20} className="text-gray-500" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{o.orderNumber}</p>
                    <WorkOrderBadge status={o.status} />
                  </div>
                  <p className="text-sm text-gray-700 truncate">{o.vehicle?.year} {o.vehicle?.make} {o.vehicle?.model}{o.vehicle?.licensePlate ? ` · ${o.vehicle.licensePlate}` : ''}</p>
                  <p className="text-xs text-gray-400 truncate">{o.description || 'Sin descripción'} · recibido {fDate(o.receivedAt)}</p>
                  {p.total > 0 && (
                    <p className={clsx('mt-1 inline-flex items-center gap-1 text-xs font-medium', p.done === p.total ? 'text-emerald-600' : 'text-brand-600')}>
                      <Camera size={12} /> Fotos {p.done}/{p.total}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
