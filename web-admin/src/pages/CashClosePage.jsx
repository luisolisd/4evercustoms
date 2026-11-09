import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, Printer, Banknote, CreditCard, ArrowLeftRight, CircleDollarSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { previewCashCut, createCashCut, getCashCuts } from '../services/cashCuts';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { methodLabel } from '../components/PaymentsModal';
import { useToast } from '../hooks/useToast';
import { fMoney, fDateTime, toLocalInput, fromLocalInput } from '../utils/formatters';

const METHOD_CARDS = [
  { key: 'CASH', icon: Banknote, color: 'bg-emerald-50 text-emerald-700' },
  { key: 'CARD', icon: CreditCard, color: 'bg-blue-50 text-blue-700' },
  { key: 'TRANSFER', icon: ArrowLeftRight, color: 'bg-purple-50 text-purple-700' },
  { key: 'OTHER', icon: CircleDollarSign, color: 'bg-gray-100 text-gray-700' },
];

const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function CashClosePage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [fromLocal, setFromLocal] = useState(toLocalInput(startOfTodayLocal()));
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [histPage, setHistPage] = useState(1);

  const fromIso = useMemo(() => fromLocalInput(fromLocal) || undefined, [fromLocal]);

  const { data: preview, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['cash-preview', workshopId, fromIso],
    queryFn: () => previewCashCut(workshopId, { from: fromIso }).then((r) => r.data),
    enabled: !!workshopId,
    retry: false,
  });

  const { data: history } = useQuery({
    queryKey: ['cash-cuts', workshopId, histPage],
    queryFn: () => getCashCuts(workshopId, { page: histPage, limit: 10 }),
    enabled: !!workshopId,
  });

  const closeMut = useMutation({
    mutationFn: () => createCashCut(workshopId, {
      from: preview.from, to: preview.to, countedCash: counted === '' ? undefined : Number(counted), notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Corte de caja realizado');
      setConfirm(false); setCounted(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['cash-preview', workshopId] });
      qc.invalidateQueries({ queryKey: ['cash-cuts', workshopId] });
    },
    onError: (e) => { toast.error(e.message || 'No se pudo realizar el corte'); setConfirm(false); },
  });

  const totals = preview?.totals;
  const difference = counted !== '' && totals ? Number(counted) - totals.CASH : null;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-3 print:hidden">
        <div>
          <p className="eyebrow mb-1">Caja</p>
          <h1 className="page-title">Corte de caja</h1>
          <p className="page-subtitle">Cobros registrados desde el último corte</p>
        </div>
        <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
      </div>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div className="w-56"><Input label="Desde" type="datetime-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} /></div>
          <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>Actualizar</Button>
          {preview?.clamped && <p className="text-xs text-amber-600">Se ajustó al último corte para no contar cobros dos veces.</p>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : error ? (
          <div className="card p-6 text-sm text-gray-600 flex items-center gap-3"><Wallet size={18} className="text-gray-400" /> {error.message}</div>
        ) : (
          <>
            <p className="text-sm text-gray-500">Periodo: <b>{fDateTime(preview.from)}</b> a <b>{fDateTime(preview.to)}</b> · {totals.count} cobro(s)</p>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {METHOD_CARDS.map(({ key, icon: Icon, color }) => (
                <div key={key} className="card p-4">
                  <div className={`inline-flex p-2 rounded-lg ${color}`}><Icon size={16} /></div>
                  <p className="text-xs text-gray-500 mt-2">{methodLabel(key)}</p>
                  <p className="text-lg font-bold text-gray-900">{fMoney(totals[key])}</p>
                </div>
              ))}
              <div className="card p-4 bg-gray-900 text-white col-span-2 lg:col-span-1">
                <p className="text-xs text-gray-300">Total cobrado</p>
                <p className="text-2xl font-bold mt-1">{fMoney(totals.total)}</p>
              </div>
            </div>

            <div className="card p-5 space-y-4 print:hidden">
              <p className="text-sm font-semibold text-gray-800">Arqueo de efectivo</p>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Efectivo esperado</p><p className="font-bold">{fMoney(totals.CASH)}</p></div>
                <Input label="Efectivo contado" type="number" step="0.01" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} />
                <div className={`rounded-xl p-3 ${difference === null ? 'bg-gray-50' : difference === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className="text-xs text-gray-500">Diferencia</p>
                  <p className="font-bold">{difference === null ? '—' : fMoney(difference)}</p>
                </div>
              </div>
              <Textarea label="Notas del corte" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={() => setConfirm(true)} disabled={totals.count === 0 && counted === ''}>Realizar corte</Button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Hora</th>
                      <th className="text-left px-4 py-3">Orden</th>
                      <th className="text-left px-4 py-3">Cliente</th>
                      <th className="text-left px-4 py-3">Método</th>
                      <th className="text-left px-4 py-3">Recibió</th>
                      <th className="text-right px-4 py-3">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.payments.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay cobros en este periodo.</td></tr>
                    )}
                    {preview.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-gray-500">{fDateTime(p.createdAt)}</td>
                        <td className="px-4 py-3"><Link to={`/work-orders/${p.workOrderId}`} className="font-medium text-brand-700">{p.workOrder?.orderNumber}</Link></td>
                        <td className="px-4 py-3">{p.workOrder?.customer?.firstName} {p.workOrder?.customer?.lastName}</td>
                        <td className="px-4 py-3">{methodLabel(p.method)}{p.note ? <span className="text-xs text-gray-400"> · {p.note}</span> : null}</td>
                        <td className="px-4 py-3 text-gray-500">{p.receivedByName || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{fMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="space-y-3 print:hidden">
        <h2 className="font-display font-bold text-gray-900">Cortes anteriores</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Periodo</th>
                  <th className="text-right px-4 py-3">Efectivo</th>
                  <th className="text-right px-4 py-3">Tarjeta</th>
                  <th className="text-right px-4 py-3">Transf.</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Diferencia</th>
                  <th className="text-left px-4 py-3">Realizó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(history?.data || []).length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin cortes todavía.</td></tr>}
                {(history?.data || []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-gray-600">{fDateTime(c.fromAt)} → {fDateTime(c.toAt)}{c.notes ? <p className="text-xs text-gray-400">{c.notes}</p> : null}</td>
                    <td className="px-4 py-3 text-right">{fMoney(c.totals.CASH)}</td>
                    <td className="px-4 py-3 text-right">{fMoney(c.totals.CARD)}</td>
                    <td className="px-4 py-3 text-right">{fMoney(c.totals.TRANSFER)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fMoney(c.totals.total)}</td>
                    <td className={`px-4 py-3 text-right ${c.difference && Number(c.difference) !== 0 ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>{c.difference === null ? '—' : fMoney(c.difference)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.closedByName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history?.pagination && <Pagination {...history.pagination} onPageChange={setHistPage} />}
        </div>
      </section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => closeMut.mutate()}
        loading={closeMut.isPending}
        title="Realizar corte de caja"
        message="Se guardará el corte con los totales actuales y el siguiente periodo empezará desde este momento. No se puede modificar después."
      />
    </div>
  );
}
