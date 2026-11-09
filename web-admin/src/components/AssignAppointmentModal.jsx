import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAuthStore } from '../store/authStore';
import { getTechnicians } from '../services/team';
import { updateAppointment } from '../services/appointments';
import { useToast } from '../hooks/useToast';

/**
 * Asigna una cita "por ingresar" a un técnico (o al administrador). La persona recibe un aviso
 * y la ve en su panel hasta que el vehículo ingresa.
 */
export default function AssignAppointmentModal({ open, onClose, appointment, onSaved }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const toast = useToast();
  const [id, setId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['technicians', workshopId],
    queryFn: () => getTechnicians(workshopId).then((r) => r.data),
    enabled: !!workshopId && open,
  });
  const people = data || [];

  useEffect(() => { if (open) setId(appointment?.assignedTo?.id || appointment?.assignedToId || ''); }, [open, appointment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mut = useMutation({
    mutationFn: () => updateAppointment(workshopId, appointment.id, { assignedToId: id || '' }),
    onSuccess: () => { toast.success(id ? 'Cita asignada. Se le avisó a la persona.' : 'Se quitó la asignación'); onSaved?.(); onClose(); },
    onError: (e) => toast.error(e.message || 'No se pudo asignar'),
  });

  const Row = ({ u }) => (
    <button
      type="button"
      onClick={() => setId(id === u.id ? '' : u.id)}
      className={clsx('w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition', id === u.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}
    >
      <span className={clsx('h-8 w-8 rounded-sm flex items-center justify-center text-xs font-bold', id === u.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}>{u.firstName?.[0]}{u.lastName?.[0]}</span>
      <span className="flex-1 text-sm font-medium text-gray-900">
        {u.firstName} {u.lastName}
        {u.role === 'WORKSHOP_ADMIN' && <span className="ml-2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">Administrador</span>}
      </span>
      {id === u.id && <Check size={16} className="text-brand-600" />}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Asignar cita por ingresar" size="sm">
      <div className="space-y-4">
        {appointment && (
          <p className="text-sm text-gray-600">
            {appointment.customer?.firstName} {appointment.customer?.lastName} · {appointment.serviceType}
          </p>
        )}
        {isLoading ? <p className="text-sm text-gray-400">Cargando…</p> : people.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-md bg-gray-50 p-3">No hay técnicos activos. Un administrador puede crearlos en <b>Usuarios</b>.</p>
        ) : (
          <div className="space-y-2">{people.map((u) => <Row key={u.id} u={u} />)}</div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={people.length === 0}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
