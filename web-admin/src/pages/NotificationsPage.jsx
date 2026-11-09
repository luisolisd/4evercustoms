import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ClipboardList, CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { fDateTime } from '../utils/formatters';

// Bandeja de avisos del personal: asignaciones de órdenes y citas por ingresar
export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getMyNotifications({ limit: 50 }),
    refetchInterval: 60_000,
  });
  const rows = data?.data || [];
  const unread = data?.unread || 0;

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readMut = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const allMut = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  const open = (n) => {
    if (!n.isRead) readMut.mutate(n.id);
    const url = n.data?.url;
    if (url) navigate(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Avisos</p>
          <h1 className="page-title">Notificaciones</h1>
          <p className="page-subtitle">{unread ? `${unread} sin leer` : 'Todo al día'}</p>
        </div>
        {unread > 0 && <Button variant="secondary" icon={CheckCheck} onClick={() => allMut.mutate()} loading={allMut.isPending}>Marcar todo como leído</Button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-14"><div className="animate-spin h-7 w-7 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Bell} title="Sin notificaciones" description="Aquí verás las órdenes y citas que te asignen." />
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((n) => {
              const Icon = n.data?.appointmentId ? CalendarClock : ClipboardList;
              return (
                <button key={n.id} onClick={() => open(n)} className={clsx('w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50', !n.isRead && 'bg-brand-50/40')}>
                  <span className={clsx('mt-0.5 p-2 rounded', n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-brand-100 text-brand-700')}><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={clsx('text-sm', n.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900')}>{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                    </span>
                    <span className="block text-sm text-gray-600">{n.body}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{fDateTime(n.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
