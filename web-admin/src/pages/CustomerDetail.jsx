import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Car, ClipboardList, CalendarDays, KeyRound, RotateCcw } from 'lucide-react';
import { useAuthStore, selectIsAdmin } from '../store/authStore';
import { getCustomer, setCustomerPassword } from '../services/customers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { getWorkOrders } from '../services/workOrders';
import { WorkOrderBadge, PaymentBadge } from '../components/ui/Badge';
import BrandLogo from '../components/ui/BrandLogo';
import { fDate, fMoney } from '../utils/formatters';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workshopId = useAuthStore((s) => s.workshopId);
  const isAdmin = useAuthStore(selectIsAdmin);

  const { data, isLoading } = useQuery({
    queryKey: ['customer', workshopId, id],
    queryFn: () => getCustomer(workshopId, id),
    enabled: !!workshopId,
  });
  const c = data?.data;

  const { data: ordersRes } = useQuery({
    queryKey: ['customer-orders', workshopId, id],
    queryFn: () => getWorkOrders(workshopId, { customerId: id, limit: 50 }),
    enabled: !!workshopId,
  });
  const orders = ordersRes?.data || [];

  if (isLoading) {
    return <div className="flex justify-center py-24"><div className="animate-spin h-10 w-10 rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  }
  if (!c) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500"><ArrowLeft size={16} /> Volver</button>
        <p className="text-gray-500">Cliente no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a clientes
      </button>

      {/* Perfil */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold shrink-0">
            {c.firstName?.[0]}{c.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{c.firstName} {c.lastName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /> {c.phone}</span>
            {c.rfc && <span className="flex items-center gap-1.5"><span className="text-[11px] font-semibold text-gray-400">RFC</span> {c.rfc}</span>}
              {c.email && <span className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" /> {c.email}</span>}
              {c.address && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" /> {c.address}</span>}
            </div>
          </div>
        </div>
        {c.notes && <p className="text-sm text-gray-500 mt-4 bg-gray-50 rounded p-3">{c.notes}</p>}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat icon={Car} label="Vehículos" value={c.vehicles?.length ?? 0} />
          <Stat icon={ClipboardList} label="Órdenes" value={c._count?.workOrders ?? 0} />
          <Stat icon={CalendarDays} label="Citas" value={c._count?.appointments ?? 0} />
        </div>
      </div>

      {isAdmin && <PortalAccess customer={c} workshopId={workshopId} />}

      {/* Vehículos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Vehículos</h2>
        {(!c.vehicles || c.vehicles.length === 0) ? (
          <p className="text-sm text-gray-400 bg-white rounded-md p-4 border border-gray-200">Sin vehículos registrados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {c.vehicles.map((v) => (
              <div key={v.id} className="bg-white rounded-md p-4 shadow-sm border border-gray-200 flex items-center gap-3">
                <div className="bg-white border border-gray-200 rounded-md w-10 h-10 flex items-center justify-center"><BrandLogo make={v.make} size={24} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{v.year} {v.make} {v.model}</p>
                  <p className="text-xs text-gray-500">{v.licensePlate || 'Sin placa'}{v.color ? ` · ${v.color}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Órdenes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Órdenes de trabajo</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-md p-4 border border-gray-200">Sin órdenes.</p>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-50">
            {orders.map((o) => (
              <button key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 text-left">
                <div>
                  <p className="font-mono font-bold text-gray-900">{o.orderNumber}</p>
                  <p className="text-xs text-gray-500">{o.vehicle?.year} {o.vehicle?.make} {o.vehicle?.model} · {fDate(o.receivedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block font-semibold text-gray-900">{fMoney(o.totalAmount)}</span>
                  <WorkOrderBadge status={o.status} />
                  <PaymentBadge status={o.paymentStatus} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

// Solo admin: cambiar la contraseña del portal del cliente o borrarla para que él cree una nueva
function PortalAccess({ customer, workshopId }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(null); // 'password' | 'reset' | null
  const [password, setPassword] = useState('');

  const mut = useMutation({
    mutationFn: (pw) => setCustomerPassword(workshopId, customer.id, pw),
    onSuccess: (r, pw) => {
      qc.invalidateQueries({ queryKey: ['customer', workshopId, customer.id] });
      setModal(null);
      toast.success(pw ? 'Contraseña actualizada' : 'Acceso restablecido');
    },
    onError: (e) => toast.error(e.message || 'Ocurrió un error'),
  });

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-700">Acceso al portal</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {customer.hasPassword
              ? 'El cliente ya creó su contraseña.'
              : 'Sin contraseña: la creará la próxima vez que entre con su número.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={KeyRound} onClick={() => { setPassword(randomPassword()); setModal('password'); }}>
            Cambiar contraseña
          </Button>
          {customer.hasPassword && (
            <Button variant="secondary" icon={RotateCcw} onClick={() => setModal('reset')}>Restablecer acceso</Button>
          )}
        </div>
      </div>

      <Modal open={modal === 'password'} onClose={() => setModal(null)} title="Cambiar contraseña del cliente" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(password); }} className="space-y-4">
          <p className="text-sm text-gray-600">{customer.firstName} {customer.lastName} · {customer.phone}</p>
          <Input label="Nueva contraseña *" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <p className="text-xs text-gray-500">Compártela con el cliente; entra al portal con su número y esta contraseña.</p>
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setPassword(randomPassword())}>Generar</Button>
            <Button type="submit" loading={mut.isPending}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={modal === 'reset'}
        onClose={() => setModal(null)}
        onConfirm={() => mut.mutate(undefined)}
        loading={mut.isPending}
        variant="primary"
        title="Restablecer acceso"
        message={`Se borrará la contraseña actual de ${customer.firstName}. La próxima vez que entre al portal con su número, creará una nueva.`}
      />
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50 rounded-md p-4 text-center">
    <Icon size={18} className="mx-auto text-gray-400 mb-1" />
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);
