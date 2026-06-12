import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Phone, Mail, Eye, Edit2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/customers';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import CustomerForm from '../components/forms/CustomerForm';
import { useToast } from '../hooks/useToast';
import { fDate } from '../utils/formatters';

export default function CustomersPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'create' | { mode:'edit', customer }
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', workshopId, search, page],
    queryFn: () => getCustomers(workshopId, { search, page, limit: 15 }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });

  const customers = data?.data || [];
  const pagination = data?.pagination;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['customers', workshopId] });

  const createMut = useMutation({
    mutationFn: (d) => createCustomer(workshopId, d),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Cliente creado'); },
    onError: (e) => toast.error(e.message || 'Error al crear cliente'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(workshopId, id, data),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Cliente actualizado'); },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCustomer(workshopId, id),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Cliente eliminado'); },
    onError: (e) => toast.error(e.message || 'Error al eliminar'),
  });

  const handleSubmit = (data) => {
    if (modal?.mode === 'edit') {
      updateMut.mutate({ id: modal.customer.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} clientes registrados</p>
        </div>
        <Button icon={Plus} onClick={() => setModal('create')}>Nuevo cliente</Button>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Buscar por nombre, teléfono, email..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay clientes"
            description={search ? 'Ningún cliente coincide con tu búsqueda.' : 'Agrega tu primer cliente para comenzar.'}
            action={!search ? 'Agregar cliente' : undefined}
            onAction={() => setModal('create')}
          />
        ) : (
          <>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Contacto</th>
                  <th className="text-center px-5 py-3">Vehículos</th>
                  <th className="text-center px-5 py-3">Órdenes</th>
                  <th className="text-left px-5 py-3">Registrado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                          {c.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone size={12} className="text-gray-400" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail size={12} className="text-gray-400" />
                            <span className="truncate max-w-[180px]">{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {c._count?.vehicles ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-brand-50 text-brand-700 rounded-full text-xs font-bold">
                        {c._count?.workOrders ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{fDate(c.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => setModal({ mode: 'edit', customer: c })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {pagination && (
              <Pagination {...pagination} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Editar cliente' : 'Nuevo cliente'}
        size="md"
      >
        <CustomerForm
          defaultValues={modal?.mode === 'edit' ? modal.customer : undefined}
          onSubmit={handleSubmit}
          loading={createMut.isPending || updateMut.isPending}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMut.mutate(deleting?.id)}
        loading={deleteMut.isPending}
        title="Eliminar cliente"
        message={`¿Deseas eliminar a ${deleting?.firstName} ${deleting?.lastName}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
