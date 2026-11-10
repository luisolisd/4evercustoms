import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, AlertTriangle, Edit2, ArrowUpDown, Trash2 } from 'lucide-react';
import { useAuthStore, selectIsAdmin } from '../store/authStore';
import {
  createPart, updatePart, deletePart,
  getInventory, createMovement,
} from '../services/inventory';
import Button from '../components/ui/Button';
import ResponsiveTable, { RowAction } from '../components/ui/ResponsiveTable';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import PartForm from '../components/forms/PartForm';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { useToast } from '../hooks/useToast';
import { fMoney, fNumber } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

const MOVEMENT_OPTS = [
  { value: 'IN',          label: 'Entrada de stock' },
  { value: 'OUT',         label: 'Salida de stock' },
  { value: 'ADJUSTMENT',  label: 'Ajuste (fijar existencia al conteo)' },
];

function StockBadge({ quantity, minQuantity }) {
  const qty = Number(quantity);
  const min = Number(minQuantity);
  if (qty === 0)    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Sin stock</span>;
  if (qty <= min)   return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">Stock bajo</span>;
  return               <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">OK</span>;
}

export default function InventoryPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const isAdmin = useAuthStore(selectIsAdmin);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lowStock, setLowStock] = useState(false);
  const [partModal, setPartModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', workshopId, search, page, lowStock],
    queryFn: () => getInventory(workshopId, { search, page, limit: 15, lowStock: lowStock || undefined }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });

  const inventory = data?.data || [];
  const pagination = data?.pagination;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inventory', workshopId] });
    qc.invalidateQueries({ queryKey: ['parts-all', workshopId] });
  };

  const createPartMut = useMutation({
    mutationFn: (d) => createPart(workshopId, d),
    onSuccess: () => { invalidate(); setPartModal(null); toast.success('Refacción creada'); },
    onError: (e) => toast.error(e.message),
  });

  const updatePartMut = useMutation({
    mutationFn: ({ id, data }) => updatePart(workshopId, id, data),
    onSuccess: () => { invalidate(); setPartModal(null); toast.success('Refacción actualizada'); },
    onError: (e) => toast.error(e.message),
  });

  const movForm = useForm({ defaultValues: { type: 'IN', quantity: 1, reason: '' } });

  const movementMut = useMutation({
    mutationFn: (d) => createMovement(workshopId, movementModal?.inventoryId, { type: d.type, quantity: d.quantity, reason: d.reason }),
    onSuccess: () => { invalidate(); setMovementModal(null); movForm.reset({ type: 'IN', quantity: 1, reason: '' }); toast.success('Movimiento registrado'); },
    onError: (e) => toast.error(e.message),
  });

  const deletePartMut = useMutation({
    mutationFn: (id) => deletePart(workshopId, id),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Refacción eliminada'); },
    onError: (e) => toast.error(e.message),
  });

  const handlePartSubmit = (data) => {
    if (partModal?.mode === 'edit') updatePartMut.mutate({ id: partModal.part.id, data });
    else createPartMut.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} refacciones</p>
        </div>
        <Button icon={Plus} onClick={() => setPartModal('create')}>Nueva refacción</Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por nombre, SKU, marca..." className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm" />
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <AlertTriangle size={13} className="text-yellow-500" />
          Solo stock bajo
        </label>
      </div>

      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : inventory.length === 0 ? (
          <EmptyState icon={Package} title="Sin refacciones" description={search ? 'Ninguna refacción coincide.' : 'Agrega la primera refacción al inventario.'} action={!search ? 'Agregar refacción' : undefined} onAction={() => setPartModal('create')} />
        ) : (
          <>
            <ResponsiveTable
  rows={inventory}
  rowKey="id"
  rowClassName={(item) => (Number(item.quantity) === 0 ? 'bg-red-50/30' : Number(item.quantity) <= Number(item.minQuantity) ? 'bg-yellow-50/40' : '')}
  columns={[
    { key: 'part', header: 'Refacción', mobile: 'title', cell: (item) => {
      const qty = Number(item.quantity); const low = qty <= Number(item.minQuantity);
      return (
        <div className="flex items-center gap-2 min-w-0">
          {low && <AlertTriangle size={14} className={clsx('shrink-0', qty === 0 ? 'text-red-500' : 'text-yellow-500')} />}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{item.part?.name}</p>
            <p className="text-xs text-gray-400 font-mono">{item.part?.sku || '—'}{item.part?.brand ? ` · ${item.part.brand}` : ''}</p>
          </div>
        </div>
      );
    } },
    { key: 'state', header: 'Estado', align: 'center', mobile: 'badge', cell: (item) => <StockBadge quantity={Number(item.quantity)} minQuantity={Number(item.minQuantity)} /> },
    { key: 'price', header: 'Precio unit. (IVA incl.)', mobileLabel: 'Precio (IVA incl.)', align: 'right', cell: (item) => <span className="font-medium text-gray-900">{fMoney(item.part?.unitPrice)}</span> },
    { key: 'stock', header: 'Stock', align: 'right', cell: (item) => {
      const qty = Number(item.quantity); const low = qty <= Number(item.minQuantity);
      return <span className={clsx('font-bold md:text-lg', qty === 0 ? 'text-red-600' : low ? 'text-yellow-600' : 'text-green-700')}>{fNumber(qty)}</span>;
    } },
    { key: 'min', header: 'Mínimo', align: 'right', cell: (item) => <span className="text-gray-500">{fNumber(Number(item.minQuantity))}</span> },
  ]}
  actions={(item, { mobile }) => (
    <>
      <RowAction mobile={mobile} icon={ArrowUpDown} label="Movimiento" tone="brand" onClick={() => { movForm.setValue('type', 'IN'); setMovementModal({ part: item.part, inventoryId: item.id }); }} />
      <RowAction mobile={mobile} icon={Edit2} label="Editar" tone="blue" onClick={() => setPartModal({ mode: 'edit', part: { ...item.part, minQuantity: item.minQuantity, quantity: item.quantity, location: item.location } })} />
      {isAdmin && <RowAction mobile={mobile} icon={Trash2} label="Eliminar" tone="red" onClick={() => setDeleting(item.part)} />}
    </>
  )}
/>
            {pagination && <Pagination {...pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* Part create/edit modal */}
      <Modal
        open={!!partModal}
        onClose={() => setPartModal(null)}
        title={partModal?.mode === 'edit' ? 'Editar refacción' : 'Nueva refacción'}
        size="md"
      >
        <PartForm
          defaultValues={partModal?.mode === 'edit' ? partModal.part : undefined}
          onSubmit={handlePartSubmit}
          loading={createPartMut.isPending || updatePartMut.isPending}
        />
      </Modal>

      {/* Movement modal */}
      <Modal
        open={!!movementModal}
        onClose={() => setMovementModal(null)}
        title={`Movimiento — ${movementModal?.part?.name}`}
        size="sm"
      >
        <form onSubmit={movForm.handleSubmit((d) => movementMut.mutate(d))} className="space-y-4">
          <Select
            label="Tipo de movimiento"
            options={MOVEMENT_OPTS}
            {...movForm.register('type', { required: true })}
          />
          <Input
            label="Cantidad"
            type="number"
            min={0}
            step="any"
            {...movForm.register('quantity', { required: true, min: 0, valueAsNumber: true })}
            error={movForm.formState.errors.quantity?.message}
          />
          <Textarea
            label="Razón / nota"
            rows={2}
            placeholder="Ej. Compra a proveedor XYZ"
            {...movForm.register('reason')}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setMovementModal(null)}>Cancelar</Button>
            <Button type="submit" loading={movementMut.isPending}>Registrar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deletePartMut.mutate(deleting.id)}
        loading={deletePartMut.isPending}
        title="Eliminar refacción"
        message={`¿Eliminar "${deleting?.name}" del inventario?`}
      />
    </div>
  );
}


