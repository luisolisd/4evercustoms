import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Eye, Trash2 } from 'lucide-react';
import { useAuthStore, selectIsAdmin } from '../store/authStore';
import { getWorkOrders, createWorkOrder, deleteWorkOrder } from '../services/workOrders';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { WorkOrderBadge, PaymentBadge } from '../components/ui/Badge';
import WorkOrderForm from '../components/forms/WorkOrderForm';
import AssignTechniciansModal from '../components/AssignTechniciansModal';
import { getTechnicians } from '../services/team';
import Select from '../components/ui/Select';
import SearchInput from '../components/ui/SearchInput';
import { useToast } from '../hooks/useToast';
import { fDate, fMoney } from '../utils/formatters';
import { WORK_ORDER_FLOW_OPTS } from '../constants/statuses';
import ResponsiveTable, { RowAction } from '../components/ui/ResponsiveTable';

const STATUS_OPTS = [{ value: '', label: 'Todos los estados' }, ...WORK_ORDER_FLOW_OPTS];

export default function WorkOrdersPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const isAdmin = useAuthStore(selectIsAdmin);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const { data: crewRes } = useQuery({
    queryKey: ['technicians', workshopId],
    queryFn: () => getTechnicians(workshopId).then((r) => r.data),
    enabled: !!workshopId,
  });
  const techOpts = [
    { value: '', label: 'Todos los técnicos' },
    ...(crewRes || []).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}${u.role === 'WORKSHOP_ADMIN' ? ' (admin)' : ''}`.trim() })),
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', workshopId, statusFilter, techFilter, search, page],
    queryFn: () => getWorkOrders(workshopId, { status: statusFilter || undefined, technicianId: techFilter || undefined, search: search || undefined, page, limit: 15 }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  const createMut = useMutation({
    mutationFn: (d) => createWorkOrder(workshopId, d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['work-orders', workshopId] });
      setShowCreate(false);
      toast.success(`Orden ${res.data.orderNumber} creada`);
      navigate(`/work-orders/${res.data.id}?tab=recepcion`);
    },
    onError: (e) => toast.error(e.message || 'Error al crear orden'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteWorkOrder(workshopId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders', workshopId] }); setDeleting(null); toast.success('Orden eliminada'); },
    onError: (e) => toast.error(e.message || 'Error al eliminar'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} órdenes</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Nueva orden</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por número, cliente..." className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm" />
        <Select options={STATUS_OPTS} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full sm:w-[220px]" />
        <Select options={techOpts} value={techFilter} onChange={(e) => { setTechFilter(e.target.value); setPage(1); }} className="w-full sm:w-[220px]" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No hay órdenes" description="Crea la primera orden de trabajo." action="Nueva orden" onAction={() => setShowCreate(true)} />
        ) : (
          <>
            <ResponsiveTable
  rows={orders}
  onRowClick={(o) => navigate(`/work-orders/${o.id}`)}
  columns={[
    { key: 'num', header: 'Orden', mobile: 'title', cell: (o) => (
      <div><p className="font-mono font-bold text-gray-900">{o.orderNumber}</p><p className="text-xs text-gray-400">{o._count?.photos ?? 0} fotos · {o._count?.quotes ?? 0} cot.</p></div>
    ) },
    { key: 'status', header: 'Estado', align: 'center', mobile: 'badge', cell: (o) => <WorkOrderBadge status={o.status} /> },
    { key: 'pay', header: 'Pago', align: 'center', mobile: 'badge', cell: (o) => <PaymentBadge status={o.paymentStatus} /> },
    { key: 'who', header: 'Cliente / Vehículo', mobileLabel: 'Cliente', cell: (o) => (
      <div><p className="font-medium text-gray-900">{o.customer?.firstName} {o.customer?.lastName}</p><p className="text-xs text-gray-500">{o.vehicle?.year} {o.vehicle?.make} {o.vehicle?.model}{o.vehicle?.licensePlate ? ` · ${o.vehicle.licensePlate}` : ''}</p></div>
    ) },
    { key: 'tech', header: 'Técnico', cell: (o) => (
      <button
        onClick={(e) => { e.stopPropagation(); setAssigning(o); }}
        title="Asignar técnico"
        className={o.technicians?.length ? 'text-gray-700 hover:text-brand-600 hover:underline text-sm' : 'inline-flex rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 px-3 py-1 text-xs font-semibold hover:bg-amber-100'}
      >
        {o.technicians?.length ? o.technicians.map((t) => t.firstName).join(', ') : 'Asignar técnico'}
      </button>
    ) },
    { key: 'total', header: 'Total', align: 'right', cell: (o) => <span className="font-semibold text-gray-900">{fMoney(o.totalAmount)}</span> },
    { key: 'recv', header: 'Recibido', cell: (o) => <span className="text-gray-500">{fDate(o.receivedAt)}</span> },
  ]}
  actions={(o, { mobile }) => (
    <>
      <RowAction mobile={mobile} icon={Eye} label="Abrir orden" tone="brand" onClick={() => navigate(`/work-orders/${o.id}`)} />
      {isAdmin && <RowAction mobile={mobile} icon={Trash2} label="Eliminar" tone="red" onClick={() => setDeleting(o)} />}
    </>
  )}
/>
            {pagination && <Pagination {...pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva orden de trabajo" size="lg">
        <WorkOrderForm onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMut.mutate(deleting.id)}
        loading={deleteMut.isPending}
        title="Eliminar orden"
        message={`¿Eliminar la orden ${deleting?.orderNumber}? Se borrarán sus fotos, refacciones, cotizaciones e historial. Esta acción no se puede deshacer.`}
      />

      <AssignTechniciansModal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        order={assigning}
        onSaved={() => qc.invalidateQueries({ queryKey: ['work-orders', workshopId] })}
      />
    </div>
  );
}

