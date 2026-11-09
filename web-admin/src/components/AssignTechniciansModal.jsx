import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAuthStore } from '../store/authStore';
import { getTechnicians } from '../services/team';
import { updateWorkOrder } from '../services/workOrders';
import { useToast } from '../hooks/useToast';

/**
 * Asignar técnico(s) a una orden. Guarda al instante, sin pasar por "Editar".
 *  order: { id, orderNumber, technicians: [{ id, ... }] }
 */
function Person({ u, on, onToggle, note }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
        on ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <span className={clsx('h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold', on ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}>
        {u.firstName?.[0]}{u.lastName?.[0]}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-900">
        {u.firstName} {u.lastName}
        {note && <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">{note}</span>}
      </span>
      {on && <Check size={16} className="text-brand-600" />}
    </button>
  );
}

export default function AssignTechniciansModal({ open, onClose, order, onSaved }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const toast = useToast();
  const [ids, setIds] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['technicians', workshopId],
    queryFn: () => getTechnicians(workshopId).then((r) => r.data),
    enabled: !!workshopId && open,
  });
  const technicians = data || [];
  const crew = technicians.filter((u) => u.role !== 'WORKSHOP_ADMIN');
  const admins = technicians.filter((u) => u.role === 'WORKSHOP_ADMIN');

  useEffect(() => {
    if (open) setIds((order?.technicians || []).map((t) => t.id));
  }, [open, order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMut = useMutation({
    mutationFn: () => updateWorkOrder(workshopId, order.id, { technicianIds: ids }),
    onSuccess: () => {
      toast.success(ids.length ? 'Técnico(s) asignado(s)' : 'Se quitó la asignación');
      onSaved?.();
      onClose();
    },
    onError: (e) => toast.error(e.message || 'No se pudo asignar'),
  });

  const toggle = (id) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal open={open} onClose={onClose} title={`Asignar técnico${order?.orderNumber ? ` · ${order.orderNumber}` : ''}`} size="sm">
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-gray-400">Cargando técnicos…</p>
        ) : technicians.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-lg bg-gray-50 p-3">No hay técnicos activos. Un administrador puede crearlos en <b>Usuarios</b>.</p>
        ) : (
          <div className="space-y-2">
            {crew.map((u) => <Person key={u.id} u={u} on={ids.includes(u.id)} onToggle={() => toggle(u.id)} />)}
            {admins.length > 0 && (
              <>
                <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Trabajos especiales</p>
                {admins.map((u) => <Person key={u.id} u={u} on={ids.includes(u.id)} onToggle={() => toggle(u.id)} note="Administrador" />)}
              </>
            )}
            <p className="text-xs text-gray-400">Puedes elegir más de uno. Los técnicos verán la orden en su panel; el administrador la trabaja desde su vista normal.</p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} disabled={technicians.length === 0}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
