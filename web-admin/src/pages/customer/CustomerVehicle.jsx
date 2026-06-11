import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Wrench } from 'lucide-react';
import { getVehicle } from '../../services/customer';
import { WO_STATUS, money, fmtDate } from './status';

export default function CustomerVehicle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: v, isLoading } = useQuery({ queryKey: ['c-vehicle', id], queryFn: () => getVehicle(id) });

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver
      </button>

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}

      {v && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h1 className="text-lg font-bold text-gray-900">{v.make} {v.model} {v.year}</h1>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <Info label="Placa" value={v.licensePlate || '—'} />
              <Info label="Color" value={v.color || '—'} />
              <Info label="Kilometraje" value={v.mileage ? `${v.mileage.toLocaleString('es-MX')} km` : '—'} />
              <Info label="Motor" value={v.engineType || '—'} />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-700 px-1">Servicios e historial</h2>

          {(!v.workOrders || v.workOrders.length === 0) && (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm shadow-sm">
              <Wrench className="w-7 h-7 mx-auto mb-2 text-gray-300" />
              Este vehículo aún no tiene órdenes de servicio.
            </div>
          )}

          <div className="space-y-2">
            {v.workOrders?.map((o) => {
              const st = WO_STATUS[o.status];
              return (
                <Link key={o.id} to={`/cliente/orden/${o.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm hover:shadow transition">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">Orden #{o.orderNumber}</p>
                      <p className="text-xs text-gray-500 truncate">{o.description || 'Servicio'}</p>
                    </div>
                    <ChevronRight className="text-gray-300 shrink-0" size={18} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st?.color || ''}`}>{st?.label || o.status}</span>
                    <span className="text-xs text-gray-500">{fmtDate(o.receivedAt)} · {money(o.totalAmount)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-gray-800 font-medium">{value}</p>
  </div>
);
