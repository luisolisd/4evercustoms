import { useState } from 'react';
import { FileSpreadsheet, Download, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { exportExcel } from '../services/reports';

const ymd = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fLong = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

const PRESETS = [
  { k: 'today', label: 'Hoy', range: () => { const t = new Date(); return [ymd(t), ymd(t)]; } },
  { k: 'yesterday', label: 'Ayer', range: () => { const t = addDays(new Date(), -1); return [ymd(t), ymd(t)]; } },
  { k: '7', label: 'Últimos 7 días', range: () => [ymd(addDays(new Date(), -6)), ymd(new Date())] },
  { k: 'month', label: 'Este mes', range: () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(t)]; } },
  { k: 'prev', label: 'Mes anterior', range: () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), ymd(new Date(t.getFullYear(), t.getMonth(), 0))]; } },
];

const SHEETS = [
  ['Clientes y Vehículos', 'Cliente, teléfono, vehículo, kilometraje, último y próximo servicio, días restantes y estatus por color.'],
  ['Historial de Servicios', 'Cada servicio del periodo con refacciones o trabajo, costo, técnico y notas, más el total.'],
  ['Resumen', 'Indicadores del periodo, servicios por técnico y listas de vencidos y próximos a vencer.'],
  ['Llamadas de Calidad', 'Seguimiento posventa: quién llamar, estatus de la llamada y comentarios.'],
];

export default function ExportPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const toast = useToast();
  const today = ymd(new Date());
  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState(() => PRESETS.find((p) => p.k === 'month').range());
  const [busy, setBusy] = useState(false);
  const [from, to] = range;

  const pick = (p) => { setPreset(p.k); setRange(p.range()); };
  const setDate = (i) => (e) => { setPreset('custom'); setRange((r) => r.map((v, j) => (j === i ? e.target.value : v))); };
  const invalid = !from || !to || from > to;

  const download = async () => {
    setBusy(true);
    try {
      const blob = await exportExcel(workshopId, { from, to });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Registro_Clientes_${from}${from === to ? '' : `_a_${to}`}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel generado');
    } catch (e) {
      // Con responseType blob el mensaje de error llega como Blob
      let msg = 'No se pudo generar el Excel';
      try { if (e instanceof Blob) msg = JSON.parse(await e.text()).message || msg; else if (e?.message) msg = e.message; } catch { /* mensaje genérico */ }
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Exportar a Excel</h1>
        <p className="text-sm text-gray-500 mt-1">Registro de clientes y servicios del taller, listo para imprimir o compartir.</p>
      </div>

      <section className="bg-white border border-gray-200 rounded-md shadow-sm">
        <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <CalendarDays size={16} className="text-brand-600" /> Periodo a exportar
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.k}
                type="button"
                onClick={() => pick(p)}
                className={clsx(
                  'min-h-[40px] sm:min-h-0 px-3 sm:py-1.5 rounded border text-sm font-medium transition',
                  preset === p.k ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <Input label="Desde" type="date" max={today} value={from} onChange={setDate(0)} />
            <Input label="Hasta" type="date" max={today} value={to} onChange={setDate(1)} />
          </div>
          <p className="text-xs text-gray-500">
            {invalid ? 'Elige un periodo válido.' : from === to ? `Un solo día: ${fLong(from)}.` : `Del ${fLong(from)} al ${fLong(to)}.`} Para un solo día elige la misma fecha en ambos campos. Máximo un año.
          </p>

          <Button icon={Download} onClick={download} loading={busy} disabled={invalid}>Descargar Excel</Button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-md shadow-sm">
        <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FileSpreadsheet size={16} className="text-emerald-600" /> Qué incluye el archivo
        </div>
        <ul className="divide-y divide-gray-100">
          {SHEETS.map(([name, desc]) => (
            <li key={name} className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </li>
          ))}
        </ul>
        <p className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100 bg-gray-50/50">
          Incluye los servicios entregados en el periodo. Los días restantes y el estatus (vencido, próximo, programado) se recalculan solos al abrir el archivo.
        </p>
      </section>
    </div>
  );
}
