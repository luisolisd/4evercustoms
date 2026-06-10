import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getWorkOrders, createWorkOrder } from '../services/workOrders';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { WorkOrderBadge, PaymentBadge } from '../components/ui/Badge';
import WorkOrderForm from '../components/forms/WorkOrderForm';
import Select from '../components/ui/Select';
import SearchInput from '../components/ui/SearchInput';
import { useToast } from '../hooks/useToast';
import { fDate, fMoney } from '../utils/formatters';

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'RECEIVED',         label: 'Recibido' },
  { value: 'DIAGNOSIS',        label: 'Diagnóstico' },
  { value: 'AWAITING_AUTH',    label: 'Esp. autorización' },
  { value: 'IN_REPAIR',        label: 'En reparación' },
  { value: 'FINAL_TESTING',    label: 'Pruebas finales' },
  { value: 'READY_FOR_PICKUP', label: 'Listo para entrega' },
  { value: 'DELIVERED',        label: 'Entregado' },
];

export default function WorkOrdersPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', workshopId, statusFilter, search, page],
    queryFn: () => getWorkOrders(workshopId, { status: statusFilter || undefined, page, limit: 15 }),
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
      navigate(`/work-orders/${res.data.id}`);
    },
    onError: (e) => toast.error(e.message || 'Error al crear orden'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} órdenes</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Nueva orden</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por número, cliente..." className="flex-1 min-w-[200px] max-w-sm" />
        <Select options={STATUS_OPTS} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-[220px]" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No hay órdenes" description="Crea la primera orden de trabajo." action="Nueva orden" onAction={() => setShowCreate(true)} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Orden</th>
                  <th className="text-left px-5 py-3">Cliente / Vehículo</th>
                  <th className="text-center px-5 py-3">Estado</th>
                  <th className="text-center px-5 py-3">Pago</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Recibido</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/work-orders/${o.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-gray-900">{o.orderNumber}</p>
                      <p className="text-xs text-gray-400">{o._count?.photos ?? 0} fotos · {o._count?.quotes ?? 0} cot.</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{o.customer?.firstName} {o.customer?.lastName}</p>
                      <p className="text-xs text-gray-500">{o.vehicle?.year} {o.vehicle?.make} {o.vehicle?.model}{o.vehicle?.licensePlate ? ` · ${o.vehicle.licensePlate}` : ''}</p>
                    </td>
                    <td className="px-5 py-4 text-center"><WorkOrderBadge status={o.status} /></td>
                    <td className="px-5 py-4 text-center"><PaymentBadge status={o.paymentStatus} /></td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">{fMoney(o.totalAmount)}</td>
                    <td className="px-5 py-4 text-gray-500">{fDate(o.receivedAt)}</td>
                    <td className="px-5 py-4">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${o.id}`); }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && <Pagination {...pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva orden de trabajo" size="lg">
        <WorkOrderForm onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} />
      </Modal>
    </div>
  );
}
