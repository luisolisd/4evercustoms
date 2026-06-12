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
      <div className="flex items-center justify-between">
        <div>
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : vehicles.length === 0 ? (
          <EmptyState icon={Car} title="No hay vehículos" description="Registra el primer vehículo." action={!search ? 'Agregar vehículo' : undefined} onAction={() => setModal('create')} />
        ) : (
          <>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Vehículo</th>
                  <th className="text-left px-5 py-3">Propietario</th>
                  <th className="text-left px-5 py-3">Placa / VIN</th>
                  <th className="text-right px-5 py-3">Kilometraje</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white border border-gray-100 rounded-xl w-9 h-9 flex items-center justify-center">
                          <BrandLogo make={v.make} size={22} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{v.year} {v.make} {v.model}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {v.color && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <span className={clsx('w-2.5 h-2.5 rounded-full inline-block', colorDot(v.color))} />
                                {v.color}
                              </span>
                            )}
                            {v.engineType && <span className="text-xs text-gray-400">{v.engineType}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{v.customer?.firstName} {v.customer?.lastName}</p>
                      <p className="text-xs text-gray-500">{v.customer?.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      {v.licensePlate && <p className="font-mono font-medium text-gray-900">{v.licensePlate}</p>}
                      {v.vin && <p className="font-mono text-xs text-gray-500 truncate max-w-[140px]">{v.vin}</p>}
                      {!v.licensePlate && !v.vin && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-700 font-medium">
                      {v.mileage ? `${fNumber(v.mileage)} km` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: 'edit', vehicle: v })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(v)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
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
