import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Car, ChevronRight, Phone, MapPin, FileText, Check, X } from 'lucide-react';
import { getMe, getVehicles, getQuotes, respondQuote } from '../../services/customer';
import { WO_STATUS, QUOTE_STATUS, money, fmtDate } from './status';
import { PushBanner } from './CustomerNotices';
import BrandLogo from '../../components/ui/BrandLogo';

export default function CustomerHome() {
  const { data: me } = useQuery({ queryKey: ['c-me'], queryFn: getMe });
  const { data: vehicles, isLoading } = useQuery({ queryKey: ['c-vehicles'], queryFn: getVehicles });

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="pt-1">
        <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight">Hola, {me?.firstName || ''} 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">Estos son tus vehículos y su estatus.</p>
      </div>

      <PushBanner />

      <PendingQuotes />

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}

      {!isLoading && (!vehicles || vehicles.length === 0) && (
        <div className="card p-6 text-center text-gray-500 text-sm">
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
              className="block card p-4 hover:shadow-elevated hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 rounded-xl shrink-0 w-11 h-11 flex items-center justify-center shadow-soft"><BrandLogo make={v.make} size={26} /></div>
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
        <div className="card p-4">
          <p className="font-display text-sm font-bold text-gray-900 mb-2">{me.workshop.name}</p>
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

function PendingQuotes() {
  const qc = useQueryClient();
  const { data: quotes } = useQuery({ queryKey: ['c-quotes'], queryFn: getQuotes });

  const respond = useMutation({
    mutationFn: ({ id, decision }) => respondQuote(id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['c-quotes'] });
      qc.invalidateQueries({ queryKey: ['c-vehicles'] });
    },
  });

  const pending = (quotes || []).filter((q) => ['SENT', 'DRAFT'].includes(q.status));
  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700 px-1 flex items-center gap-1.5">
        <FileText size={15} className="text-brand-600" /> Cotizaciones por aprobar
      </p>
      {pending.map((q) => (
        <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900 text-sm">
              #{q.quoteNumber}{q.workOrder ? ` · Orden ${q.workOrder.orderNumber}` : ''}
            </p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${QUOTE_STATUS[q.status]?.color || ''}`}>
              {QUOTE_STATUS[q.status]?.label || q.status}
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {q.items?.map((it) => (
              <li key={it.id} className="flex justify-between text-xs text-gray-600">
                <span className="truncate pr-2">{it.description} ×{Number(it.quantity)}</span>
                <span className="shrink-0">{money(it.total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-center mt-2 pt-2 border-t">
            <span className="text-sm font-semibold text-gray-900">Total (IVA incl.)</span>
            <span className="text-sm font-bold text-gray-900">{money(q.total)}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button disabled={respond.isPending}
              onClick={() => respond.mutate({ id: q.id, decision: 'APPROVED' })}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1">
              <Check size={15} /> Aprobar
            </button>
            <button disabled={respond.isPending}
              onClick={() => respond.mutate({ id: q.id, decision: 'REJECTED' })}
              className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-lg py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1">
              <X size={15} /> Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
