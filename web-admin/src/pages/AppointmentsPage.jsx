import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarDays, Edit2, XCircle, Trash2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import { getAppointments, createAppointment, updateAppointment, updateAppStatus, cancelAppointment, deleteAppointment } from '../services/appointments';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { APPOINTMENT_STATUS } from '../components/ui/Badge';
import AppointmentForm from '../components/forms/AppointmentForm';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import { fDateTime } from '../utils/formatters';
import ResponsiveTable, { RowAction } from '../components/ui/ResponsiveTable';
import AssignAppointmentModal from '../components/AssignAppointmentModal';

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING',     label: 'Pendiente' },
  { value: 'CONFIRMED',   label: 'Confirmada' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'COMPLETED',   label: 'Completada' },
  { value: 'CANCELLED',   label: 'Cancelada' },
];

// Estados seleccionables por fila (orden del flujo de la cita)
const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];

const SELECT_COLORS = {
  gray:   'bg-gray-100 text-gray-700 ring-gray-200',
  blue:   'bg-blue-50 text-blue-700 ring-blue-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  green:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red:    'bg-red-50 text-red-700 ring-red-200',
};

// Selector de estatus por fila: dispara el cambio al elegir un estado distinto.
function StatusSelect({ value, onChange, disabled }) {
  const color = APPOINTMENT_STATUS[value]?.color || 'gray';
  return (
    <div className="relative inline-block">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        title="Cambiar estado de la cita"
        className={clsx(
          'appearance-none cursor-pointer rounded-full pl-3 pr-8 py-2 md:py-1 text-xs font-semibold ring-1 ring-inset transition',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60 disabled:cursor-wait',
          SELECT_COLORS[color]
        )}
      >
        {STATUS_FLOW.map((k) => (
          <option key={k} value={k} className="bg-white text-gray-900">{APPOINTMENT_STATUS[k]?.label || k}</option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
    </div>
  );
}

export default function AppointmentsPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [assigning, setAssigning] = useState(null);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Agenda</p>
          <h1 className="page-title">Citas</h1>
          <p className="page-subtitle">{pagination?.total ?? 0} citas</p>
        </div>
        <Button icon={Plus} onClick={() => setModal('create')}>Nueva cita</Button>
      </div>

      <div className="flex gap-3">
        <Select
          options={STATUS_OPTS}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-full sm:max-w-[220px]"
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No hay citas" description="Agenda la primera cita del día." action="Nueva cita" onAction={() => setModal('create')} />
        ) : (
          <>
            <ResponsiveTable
  rows={appointments}
  columns={[
    { key: 'when', header: 'Fecha y hora', mobile: 'title', cell: (a) => (
      <div><p className="font-semibold text-gray-900">{fDateTime(a.scheduledAt)}</p><p className="text-xs text-gray-500">{a.duration} min</p></div>
    ) },
    { key: 'status', header: 'Estado', align: 'center', mobile: 'badge', cell: (a) => (
      <StatusSelect value={a.status} disabled={statusMut.isPending} onChange={(status) => statusMut.mutate({ id: a.id, status })} />
    ) },
    { key: 'who', header: 'Cliente / Vehículo', cell: (a) => (
      <div><p className="font-medium text-gray-900">{a.customer?.firstName} {a.customer?.lastName}</p><p className="text-xs text-gray-500">{a.vehicle?.year} {a.vehicle?.make} {a.vehicle?.model}</p></div>
    ) },
    { key: 'service', header: 'Servicio', cell: (a) => <span className="text-gray-700">{a.serviceType}</span> },
    { key: 'tech', header: 'Técnico', cell: (a) => (
      <button
        onClick={(e) => { e.stopPropagation(); setAssigning(a); }}
        title="Asignar técnico"
        className={a.assignedTo ? 'text-sm text-gray-700 hover:text-brand-600 hover:underline' : 'inline-flex rounded bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 px-3 py-1 text-xs font-semibold hover:bg-amber-100'}
      >
        {a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : 'Asignar técnico'}
      </button>
    ) },
  ]}
  actions={(a, { mobile }) => (
    <>
      <RowAction mobile={mobile} icon={Edit2} label="Editar" tone="blue" onClick={() => setModal({ mode: 'edit', appointment: a })} />
      {!['CANCELLED', 'COMPLETED'].includes(a.status) && <RowAction mobile={mobile} icon={XCircle} label="Cancelar" tone="amber" onClick={() => setCancelling(a)} />}
      <RowAction mobile={mobile} icon={Trash2} label="Eliminar" tone="red" onClick={() => setDeleting(a)} />
    </>
  )}
/>
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

      <AssignAppointmentModal open={!!assigning} onClose={() => setAssigning(null)} appointment={assigning} onSaved={invalidate} />
    </div>
  );
}
