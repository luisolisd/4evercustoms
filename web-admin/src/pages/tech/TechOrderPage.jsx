import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Car } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { getWorkOrder, updateWOStatus, updateWorkOrder } from '../../services/workOrders';
import { WorkOrderBadge } from '../../components/ui/Badge';
import PhotoSlotsPanel from '../../components/PhotoSlotsPanel';
import OrderProgress from '../../components/OrderProgress';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { useToast } from '../../hooks/useToast';
import { fNumber } from '../../utils/formatters';
import { WORK_ORDER_STATUS } from '../../components/ui/Badge';

// Estatus que el técnico puede marcar (entrega y cancelación son de supervisor/admin)
const TECH_STEPS = ['DIAGNOSIS', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP'];

export default function TechOrderPage() {
  const { id } = useParams();
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => getWorkOrder(workshopId, id).then((r) => r.data),
    enabled: !!workshopId,
  });
  const order = data;

  const [notes, setNotes] = useState({ diagnosis: '', recommendations: '', technicianNotes: '' });
  const [baseline, setBaseline] = useState(null); // lo último guardado, para saber si hay cambios
  const [savedAt, setSavedAt] = useState(null);
  useEffect(() => {
    if (order) {
      const n = { diagnosis: order.diagnosis || '', recommendations: order.recommendations || '', technicianNotes: order.technicianNotes || '' };
      setNotes(n);
      setBaseline(n);
    }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['work-order', id] });
    qc.invalidateQueries({ queryKey: ['tech-orders', workshopId] });
  };

  const statusMut = useMutation({
    mutationFn: (s) => updateWOStatus(workshopId, id, s),
    onSuccess: () => { refresh(); toast.success('Estatus actualizado'); },
    onError: (e) => toast.error(e.message || 'No se pudo actualizar'),
  });
  const notesMut = useMutation({
    mutationFn: () => updateWorkOrder(workshopId, id, notes),
    onSuccess: () => { refresh(); setBaseline(notes); setSavedAt(new Date()); toast.success('Reporte guardado'); },
    onError: (e) => toast.error(e.message || 'No se pudo guardar'),
  });

  if (isLoading) return <div className="flex justify-center py-24"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  if (!order) return <p className="text-center text-gray-500 py-16">Orden no encontrada o no asignada a ti.</p>;

  const closed = ['DELIVERED', 'CANCELLED'].includes(order.status);
  const dirty = baseline && JSON.stringify(baseline) !== JSON.stringify(notes);

  return (
    <div className="space-y-5">
      <Link to="/mis-ordenes" className="inline-flex items-center gap-2 text-sm text-gray-500"><ArrowLeft size={16} /> Mis órdenes</Link>

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
          <WorkOrderBadge status={order.status} />
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gray-100 rounded-md"><Car size={20} className="text-gray-500" /></div>
          <div>
            <p className="font-semibold text-gray-900">{order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}</p>
            <p className="text-sm text-gray-500">{order.vehicle?.licensePlate || 'Sin placa'}{order.mileageIn ? ` · ${fNumber(order.mileageIn)} km` : ''}{order.vehicle?.color ? ` · ${order.vehicle.color}` : ''}</p>
          </div>
        </div>
        {order.description && (
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-1">Servicio solicitado</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{order.description}</p>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avance de la orden</p>
        <OrderProgress status={order.status} flow={order.flow} compact />
      </div>

      {!closed && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Marcar avance manualmente</p>
          <div className="grid grid-cols-2 gap-2">
            {TECH_STEPS.map((s) => (
              <button
                key={s}
                disabled={statusMut.isPending || order.status === s}
                onClick={() => statusMut.mutate(s)}
                className={clsx(
                  'rounded-md px-3 py-3 text-sm font-medium border transition',
                  order.status === s ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
                )}
              >
                {WORK_ORDER_STATUS[s].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <PhotoSlotsPanel order={order} workshopId={workshopId} kind="TECH" title="Fotos que debes registrar" onChanged={refresh} />
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Reporte del técnico</p>
        <Textarea label="Observaciones / diagnóstico" rows={3} value={notes.diagnosis} onChange={(e) => setNotes((n) => ({ ...n, diagnosis: e.target.value }))} />
        <Textarea label="Recomendaciones" rows={3} value={notes.recommendations} onChange={(e) => setNotes((n) => ({ ...n, recommendations: e.target.value }))} />
        <Textarea label="Notas internas" rows={2} value={notes.technicianNotes} onChange={(e) => setNotes((n) => ({ ...n, technicianNotes: e.target.value }))} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={dirty ? 'text-xs font-medium text-amber-600' : 'text-xs text-gray-400'}>
            {dirty ? 'Tienes cambios sin guardar' : savedAt ? `Guardado a las ${savedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}` : 'Sin cambios'}
          </p>
          <Button onClick={() => notesMut.mutate()} loading={notesMut.isPending} disabled={!dirty}>Guardar reporte</Button>
        </div>
      </div>
    </div>
  );
}
