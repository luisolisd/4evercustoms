import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Car, ClipboardList, CalendarDays, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getCustomer } from '../services/customers';
import { getWorkOrders } from '../services/workOrders';
import { WorkOrderBadge, PaymentBadge } from '../components/ui/Badge';
import { fDate, fMoney } from '../utils/formatters';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workshopId = useAuthStore((s) => s.workshopId);

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold shrink-0">
            {c.firstName?.[0]}{c.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{c.firstName} {c.lastName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /> {c.phone}</span>
              {c.email && <span className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" /> {c.email}</span>}
              {c.address && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" /> {c.address}</span>}
            </div>
          </div>
        </div>
        {c.notes && <p className="text-sm text-gray-500 mt-4 bg-gray-50 rounded-lg p-3">{c.notes}</p>}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat icon={Car} label="Vehículos" value={c.vehicles?.length ?? 0} />
          <Stat icon={ClipboardList} label="Órdenes" value={c._count?.workOrders ?? 0} />
          <Stat icon={CalendarDays} label="Citas" value={c._count?.appointments ?? 0} />
        </div>
      </div>

      {/* Vehículos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Vehículos</h2>
        {(!c.vehicles || c.vehicles.length === 0) ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl p-4 border border-gray-100">Sin vehículos registrados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {c.vehicles.map((v) => (
              <div key={v.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="p-2.5 bg-gray-100 rounded-xl"><Car size={18} className="text-gray-500" /></div>
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
          <p className="text-sm text-gray-400 bg-white rounded-xl p-4 border border-gray-100">Sin órdenes.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
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

const Stat = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50 rounded-xl p-4 text-center">
    <Icon size={18} className="mx-auto text-gray-400 mb-1" />
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);
