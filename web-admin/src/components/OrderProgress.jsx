import { Check, Circle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const FLOW = ['RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP', 'DELIVERED'];

const STEPS = [
  { key: 'reception', label: 'Recepción', range: [0, 0] },
  { key: 'diagnosis', label: 'Diagnóstico', range: [1, 1] },
  { key: 'auth', label: 'Autorización', range: [2, 2] },
  { key: 'work', label: 'Reparación y pruebas', range: [3, 4] },
  { key: 'ready', label: 'Listo para entrega', range: [5, 5] },
  { key: 'done', label: 'Entregado', range: [6, 6] },
];

// Detalle de cada etapa según lo que ya está registrado en la orden
const detailFor = (key, flow) => {
  const f = flow?.facts;
  if (!f) return '';
  switch (key) {
    case 'reception':
      return f.reception.total ? `${f.reception.done}/${f.reception.total} fotos` : '';
    case 'diagnosis':
      return f.started ? 'Notas o fotos registradas' : f.technicians ? 'Falta nota o foto del técnico' : 'Sin técnico asignado';
    case 'auth':
      return { PENDING: 'Esperando al cliente', APPROVED: 'Cotización aprobada', OTHER: 'Sin aprobar', NONE: 'Sin cotización' }[f.quote] || '';
    case 'work':
      return f.tech.total ? `${f.tech.done}/${f.tech.total} fotos del técnico` : 'Sin fotos solicitadas';
    default:
      return '';
  }
};

// Qué sigue, en una frase (guía rápida para supervisor y técnico)
const nextHint = (status, flow) => {
  const f = flow?.facts;
  if (!f || status === 'DELIVERED' || status === 'CANCELLED') return null;
  if (status === 'READY_FOR_PICKUP') return 'Vehículo listo: entrégalo al cliente para cerrar la orden.';
  if (f.reception.total && f.reception.done < f.reception.total) return `Faltan fotos de recepción (${f.reception.done}/${f.reception.total}).`;
  if (!f.technicians) return 'Asigna un técnico y pide las fotos que debe registrar.';
  if (!f.started) return 'El técnico debe registrar su diagnóstico o subir su primera foto: el estatus avanzará solo.';
  if (f.quote === 'PENDING') return 'Cotización enviada: esperando que el cliente la autorice.';
  if (f.quote === 'APPROVED' && f.tech.total && f.tech.done < f.tech.total) return `Reparación en curso: faltan ${f.tech.total - f.tech.done} foto(s) del técnico.`;
  if (f.tech.total && f.tech.done === f.tech.total) return 'Fotos completas: cuando las pruebas finales terminen, marca el vehículo como listo para entrega.';
  return 'Continúa el trabajo; el estatus avanza con notas, fotos y cotizaciones.';
};

/**
 * Avance de la orden: etapas con su detalle y la siguiente acción.
 * El estatus avanza solo con las notas, fotos y cotizaciones (nunca retrocede).
 */
export default function OrderProgress({ status, flow, compact = false }) {
  const si = FLOW.indexOf(status);
  const cancelled = status === 'CANCELLED';
  const hint = nextHint(status, flow);

  return (
    <div className="space-y-3">
      <div className={clsx('grid gap-px bg-gray-200 border border-gray-200 rounded-md overflow-hidden', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6')}>
        {STEPS.map((s) => {
          const state = cancelled || si < 0 ? 'todo' : si > s.range[1] ? 'done' : si >= s.range[0] ? 'current' : 'todo';
          const detail = detailFor(s.key, flow);
          return (
            <div
              key={s.key}
              className={clsx(
                'bg-white px-3 py-2.5 border-l-[3px]',
                state === 'done' && 'border-l-emerald-500',
                state === 'current' && 'border-l-brand-500 bg-brand-50/40',
                state === 'todo' && 'border-l-gray-200'
              )}
            >
              <div className="flex items-center gap-1.5">
                {state === 'done' && <Check size={13} className="text-emerald-600 shrink-0" />}
                {state === 'current' && <Loader2 size={13} className="text-brand-600 shrink-0" />}
                {state === 'todo' && <Circle size={13} className="text-gray-300 shrink-0" />}
                <p className={clsx('text-xs font-semibold', state === 'todo' ? 'text-gray-400' : 'text-gray-800')}>{s.label}</p>
              </div>
              {detail && state !== 'todo' && <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{detail}</p>}
            </div>
          );
        })}
      </div>
      {hint && (
        <p className="text-xs text-gray-600 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
          <b className="text-gray-800">Siguiente:</b> {hint}
        </p>
      )}
    </div>
  );
}
