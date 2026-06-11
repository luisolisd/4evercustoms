import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing } from 'lucide-react';
import { getNotifications, markNotificationRead } from '../../services/customer';
import { enablePush, pushStatus } from '../../services/push';
import { fmtDateTime } from './status';
import RefreshButton from './RefreshButton';

export default function CustomerNotices() {
  const qc = useQueryClient();
  const { data: items, isLoading, refetch, isFetching } = useQuery({ queryKey: ['c-notices'], queryFn: getNotifications });

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-notices'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Avisos</h1>
        <RefreshButton onClick={() => refetch()} spinning={isFetching} />
      </div>

      <PushBanner />

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}
      {!isLoading && (!items || items.length === 0) && (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm shadow-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No tienes avisos todavía.
        </div>
      )}

      <div className="space-y-2">
        {items?.map((n) => (
          <button key={n.id} onClick={() => !n.isRead && read.mutate(n.id)}
            className={`w-full text-left rounded-xl p-4 shadow-sm transition ${n.isRead ? 'bg-white' : 'bg-brand-50 border border-brand-100'}`}>
            <div className="flex items-start gap-2">
              {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                <p className="text-sm text-gray-600">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{fmtDateTime(n.createdAt)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PushBanner() {
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => { pushStatus().then(setStatus); }, []);

  if (status === 'subscribed' || status === 'unsupported' || status === 'loading') return null;

  const activate = async () => {
    setBusy(true);
    try {
      await enablePush();
      setStatus('subscribed');
    } catch (e) {
      alert(e.message || 'No se pudo activar.');
      setStatus(await pushStatus());
    } finally { setBusy(false); }
  };

  if (status === 'denied') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        Las notificaciones están bloqueadas. Actívalas desde los ajustes del navegador para esta página.
      </div>
    );
  }

  return (
    <button onClick={activate} disabled={busy}
      className="w-full flex items-center gap-3 bg-gray-900 text-white rounded-xl p-3 text-sm">
      <BellRing size={18} className="shrink-0" />
      <span className="flex-1 text-left">{busy ? 'Activando…' : 'Activa las notificaciones para enterarte del estatus de tu vehículo y promociones.'}</span>
    </button>
  );
}
