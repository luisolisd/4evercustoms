import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Car, ChevronRight, Phone, MapPin } from 'lucide-react';
import { getMe, getVehicles } from '../../services/customer';
import { WO_STATUS, fmtDate } from './status';

export default function CustomerHome() {
  const { data: me } = useQuery({ queryKey: ['c-me'], queryFn: getMe });
  const { data: vehicles, isLoading } = useQuery({ queryKey: ['c-vehicles'], queryFn: getVehicles });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hola, {me?.firstName || ''} 👋</h1>
        <p className="text-gray-500 text-sm">Estos son tus vehículos y su estatus.</p>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}

      {!isLoading && (!vehicles || vehicles.length === 0) && (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm shadow-sm">
          <Car className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Aún no tienes vehículos registrados. El taller los agregará por ti.
        </div>
      )}

      <div className="space-y-3">
        {vehicles?.map((v) => {
          const last = v.workOrders?.[0];
          const st = last ? WO_STATUS[last.status] : null;
          return (
            <Link key={v.id} to={`/cliente/vehiculo/${v.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm hover:shadow active:scale-[0.99] transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-brand-100 text-brand-600 rounded-lg p-2 shrink-0"><Car size={20} /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.make} {v.model} {v.year}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {v.licensePlate || 'Sin placa'}{v.color ? ` · ${v.color}` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 shrink-0" size={18} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                {st ? (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                ) : (
                  <span className="text-xs text-gray-400">Sin servicios activos</span>
                )}
                {last && <span className="text-xs text-gray-400">#{last.orderNumber} · {fmtDate(last.receivedAt)}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Datos del taller */}
      {me?.workshop && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-2">{me.workshop.name}</p>
          {me.workshop.phone && (
            <a href={`tel:${me.workshop.phone}`} className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Phone size={14} /> {me.workshop.phone}
            </a>
          )}
          {me.workshop.address && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={14} /> {me.workshop.address}{me.workshop.city ? `, ${me.workshop.city}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
