import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock, X } from 'lucide-react';
import { getOrder, respondQuote } from '../../services/customer';
import { WO_STEPS, WO_STATUS, QUOTE_STATUS, PAY_STATUS, money, fmtDate } from './status';

export default function CustomerOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: o, isLoading } = useQuery({ queryKey: ['c-order', id], queryFn: () => getOrder(id) });

  const respond = useMutation({
    mutationFn: ({ quoteId, decision, reason }) => respondQuote(quoteId, decision, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-order', id] }),
  });

  const cancelled = o?.status === 'CANCELLED';
  const currentIdx = o ? WO_STEPS.findIndex((s) => s.key === o.status) : -1;
  const delivered = o?.status === 'DELIVERED';

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver
      </button>

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}

      {o && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">Orden #{o.orderNumber}</p>
                <p className="text-xs text-gray-500">{o.vehicle?.make} {o.vehicle?.model} {o.vehicle?.year}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${WO_STATUS[o.status]?.color || ''}`}>
                {WO_STATUS[o.status]?.label || o.status}
              </span>
            </div>
            {o.description && <p className="text-sm text-gray-600 mt-3">{o.description}</p>}
            {o.estimatedReady && !delivered && !cancelled && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Clock size={13} /> Entrega estimada: {fmtDate(o.estimatedReady)}
              </p>
            )}
          </div>

          {/* Línea de tiempo del estatus */}
          {!cancelled && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Seguimiento</p>
              <ol className="space-y-0">
                {WO_STEPS.map((step, i) => {
                  const done = delivered || i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <li key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs
                          ${done ? 'bg-green-500' : active ? 'bg-brand-600' : 'bg-gray-200 text-gray-400'}`}>
                          {done ? <Check size={14} /> : i + 1}
                        </div>
                        {i < WO_STEPS.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[20px] ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className={`pb-4 ${active ? 'font-semibold text-gray-900' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                        <p className="text-sm">{step.label}</p>
                        {active && <p className="text-xs text-brand-600">En este paso</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Cotizaciones */}
          {o.quotes?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 px-1">Cotizaciones</p>
              {o.quotes.map((q) => {
                const qs = QUOTE_STATUS[q.status];
                const pending = ['SENT', 'DRAFT'].includes(q.status);
                return (
                  <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm">#{q.quoteNumber}</p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${qs?.color || ''}`}>{qs?.label || q.status}</span>
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
                    {pending && (
                      <div className="flex gap-2 mt-3">
                        <button disabled={respond.isPending}
                          onClick={() => respond.mutate({ quoteId: q.id, decision: 'APPROVED' })}
                          className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1">
                          <Check size={15} /> Aprobar
                        </button>
                        <button disabled={respond.isPending}
                          onClick={() => respond.mutate({ quoteId: q.id, decision: 'REJECTED' })}
                          className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-lg py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1">
                          <X size={15} /> Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fotos */}
          {o.photos?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 px-1 mb-2">Fotos del servicio</p>
              <div className="grid grid-cols-3 gap-2">
                {o.photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.thumbnailUrl || p.url} alt={p.caption || ''} className="w-full h-24 object-cover rounded-lg" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Pago */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Pago</p>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAY_STATUS[o.paymentStatus]?.color || ''}`}>
                {PAY_STATUS[o.paymentStatus]?.label || o.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Total del servicio</p>
                <p className="text-lg font-bold text-gray-900">{money(o.totalAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Pagado</p>
                <p className="text-sm font-medium text-gray-700">{money(o.paidAmount)}</p>
              </div>
            </div>
            {o.paymentStatus !== 'PAID' && Number(o.totalAmount) > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Saldo: <b>{money(Number(o.totalAmount) - Number(o.paidAmount))}</b> · El pago se realiza en el taller.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
