import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarDays, Edit2, XCircle, CheckCircle, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getAppointments, createAppointment, updateAppointment, updateAppStatus, cancelAppointment, deleteAppointment } from '../services/appointments';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { AppointmentBadge } from '../components/ui/Badge';
import AppointmentForm from '../components/forms/AppointmentForm';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import { fDateTime } from '../utils/formatters';

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING',     label: 'Pendiente' },
  { value: 'CONFIRMED',   label: 'Confirmada' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'COMPLETED',   label: 'Completada' },
  { value: 'CANCELLED',   label: 'Cancelada' },
];

export default function AppointmentsPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', workshopId, statusFilter, page],
    queryFn: () => getAppointments(workshopId, { status: statusFilter || undefined, page, limit: 15 }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments', workshopId] });

  const createMut = useMutation({
    mutationFn: (d) => createAppointment(workshopId, d),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Cita creada'); },
    onError: (e) => toast.error(e.message || 'Error al crear cita'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateAppointment(workshopId, id, data),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Cita actualizada'); },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateAppStatus(workshopId, id, status),
    onSuccess: () => { invalidate(); toast.success('Estado actualizado'); },
    onError: (e) => toast.error(e.message || 'Error'),
  });

  const cancelMut = useMutation({
    mutationFn: (id) => cancelAppointment(workshopId, id),
    onSuccess: () => { invalidate(); setCancelling(null); toast.success('Cita cancelada'); },
    onError: (e) => toast.error(e.message || 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAppointment(workshopId, id),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Cita eliminada'); },
    onError: (e) => toast.error(e.message || 'Error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} citas</p>
        </div>
        <Button icon={Plus} onClick={() => setModal('create')}>Nueva cita</Button>
      </div>

      <div className="flex gap-3">
        <Select
          options={STATUS_OPTS}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="max-w-[220px]"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No hay citas" description="Agenda la primera cita del día." action="Nueva cita" onAction={() => setModal('create')} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Fecha y hora</th>
                  <th className="text-left px-5 py-3">Cliente / Vehículo</th>
                  <th className="text-left px-5 py-3">Servicio</th>
                  <th className="text-center px-5 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{fDateTime(a.scheduledAt)}</p>
                      <p className="text-xs text-gray-500">{a.duration} min</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{a.customer?.firstName} {a.customer?.lastName}</p>
                      <p className="text-xs text-gray-500">{a.vehicle?.year} {a.vehicle?.make} {a.vehicle?.model}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{a.serviceType}</td>
                    <td className="px-5 py-4 text-center"><AppointmentBadge status={a.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {a.status === 'PENDING' && (
                          <button onClick={() => statusMut.mutate({ id: a.id, status: 'CONFIRMED' })} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50" title="Confirmar">
                            <CheckCircle size={15} />
                          </button>
                        )}
                        <button onClick={() => setModal({ mode: 'edit', appointment: a })} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                          <Edit2 size={15} />
                        </button>
                        {!['CANCELLED','COMPLETED'].includes(a.status) && (
                          <button onClick={() => setCancelling(a)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Cancelar">
                            <XCircle size={15} />
                          </button>
                        )}
                        <button onClick={() => setDeleting(a)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && <Pagination {...pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Editar cita' : 'Nueva cita'} size="md">
        <AppointmentForm
          defaultValues={modal?.mode === 'edit' ? modal.appointment : undefined}
          onSubmit={(d) => modal?.mode === 'edit' ? updateMut.mutate({ id: modal.appointment.id, data: d }) : createMut.mutate(d)}
          loading={createMut.isPending || updateMut.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelMut.mutate(cancelling?.id)}
        loading={cancelMut.isPending}
        title="Cancelar cita"
        message={`¿Cancelar la cita de ${cancelling?.customer?.firstName} ${cancelling?.customer?.lastName}?`}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMut.mutate(deleting?.id)}
        loading={deleteMut.isPending}
        title="Eliminar cita"
        message={`¿Eliminar definitivamente la cita de ${deleting?.customer?.firstName} ${deleting?.customer?.lastName}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
