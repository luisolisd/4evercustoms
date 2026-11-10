import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Car, Edit2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/vehicles';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import VehicleForm from '../components/forms/VehicleForm';
import BrandLogo from '../components/ui/BrandLogo';
import { useToast } from '../hooks/useToast';
import { fNumber } from '../utils/formatters';
import clsx from 'clsx';
import ResponsiveTable, { RowAction } from '../components/ui/ResponsiveTable';

export default function VehiclesPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', workshopId, search, page],
    queryFn: () => getVehicles(workshopId, { search, page, limit: 15 }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });

  const vehicles = data?.data || [];
  const pagination = data?.pagination;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles', workshopId] });

  const createMut = useMutation({
    mutationFn: (d) => createVehicle(workshopId, d),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Vehículo registrado'); },
    onError: (e) => toast.error(e.message || 'Error al registrar'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateVehicle(workshopId, id, data),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Vehículo actualizado'); },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteVehicle(workshopId, id),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Vehículo eliminado'); },
    onError: (e) => toast.error(e.message || 'Error al eliminar'),
  });

  const handleSubmit = (data) => {
    if (modal?.mode === 'edit') updateMut.mutate({ id: modal.vehicle.id, data });
    else createMut.mutate(data);
  };

  const colorDot = (color) => {
    const map = {
      Blanco: 'bg-gray-100 border border-gray-300', Negro: 'bg-gray-900',
      Gris: 'bg-gray-400', Plata: 'bg-gray-300', Rojo: 'bg-red-500',
      Azul: 'bg-blue-500', Verde: 'bg-green-500', Amarillo: 'bg-yellow-400',
      Naranja: 'bg-orange-500', Café: 'bg-amber-800',
    };
    return map[color] || 'bg-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} vehículos registrados</p>
        </div>
        <Button icon={Plus} onClick={() => setModal('create')}>Nuevo vehículo</Button>
      </div>

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Buscar por marca, modelo, placa, VIN..."
        className="max-w-md"
      />

      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : vehicles.length === 0 ? (
          <EmptyState icon={Car} title="No hay vehículos" description="Registra el primer vehículo." action={!search ? 'Agregar vehículo' : undefined} onAction={() => setModal('create')} />
        ) : (
          <>
            <ResponsiveTable
  rows={vehicles}
  columns={[
    { key: 'vehicle', header: 'Vehículo', mobile: 'title', cell: (v) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 bg-white border border-gray-200 rounded-md w-10 h-10 md:w-9 md:h-9 flex items-center justify-center shrink-0"><BrandLogo make={v.make} size={22} /></div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{v.year} {v.make} {v.model}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {v.color && <span className="flex items-center gap-1 text-xs text-gray-500"><span className={clsx('w-2.5 h-2.5 rounded-full inline-block', colorDot(v.color))} />{v.color}</span>}
            {v.engineType && <span className="text-xs text-gray-400">{v.engineType}</span>}
          </div>
        </div>
      </div>
    ) },
    { key: 'owner', header: 'Propietario', cell: (v) => (
      <div><p className="font-medium text-gray-900">{v.customer?.firstName} {v.customer?.lastName}</p><p className="text-xs text-gray-500">{v.customer?.phone}</p></div>
    ) },
    { key: 'plate', header: 'Placa / VIN', cell: (v) => (
      <div>
        {v.licensePlate && <p className="font-mono font-medium text-gray-900">{v.licensePlate}</p>}
        {v.vin && <p className="font-mono text-xs text-gray-500 truncate md:max-w-[140px]">{v.vin}</p>}
        {!v.licensePlate && !v.vin && <span className="text-gray-400">—</span>}
      </div>
    ) },
    { key: 'km', header: 'Kilometraje', align: 'right', cell: (v) => <span className="font-medium text-gray-700">{v.mileage ? `${fNumber(v.mileage)} km` : '—'}</span> },
  ]}
  actions={(v, { mobile }) => (
    <>
      <RowAction mobile={mobile} icon={Edit2} label="Editar" tone="blue" onClick={() => setModal({ mode: 'edit', vehicle: v })} />
      <RowAction mobile={mobile} icon={Trash2} label="Eliminar" tone="red" onClick={() => setDeleting(v)} />
    </>
  )}
/>
            {pagination && <Pagination {...pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Editar vehículo' : 'Nuevo vehículo'} size="lg">
        <VehicleForm
          defaultValues={modal?.mode === 'edit' ? modal.vehicle : undefined}
          onSubmit={handleSubmit}
          loading={createMut.isPending || updateMut.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMut.mutate(deleting.id)}
        loading={deleteMut.isPending}
        title="Eliminar vehículo"
        message={`¿Eliminar ${deleting?.year} ${deleting?.make} ${deleting?.model}? Su historial de servicios se conserva.`}
      />
    </div>
  );
}
