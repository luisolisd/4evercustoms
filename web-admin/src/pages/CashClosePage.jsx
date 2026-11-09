import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, Printer, Banknote, CreditCard, ArrowLeftRight, CircleDollarSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { previewCashCut, createCashCut, getCashCuts } from '../services/cashCuts';
import Button from '../components/ui/Button';
import ResponsiveTable from '../components/ui/ResponsiveTable';
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
          <div className="w-full sm:w-56"><Input label="Desde" type="datetime-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} /></div>
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
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 items-end">
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
              <ResponsiveTable
  rows={preview.payments}
  minWidth={640}
  columns={[
    { key: 'amount', header: 'Monto', align: 'right', mobile: 'title', cell: (p) => <span className="font-bold text-gray-900 text-base md:text-sm">{fMoney(p.amount)}</span> },
    { key: 'method', header: 'Método', mobile: 'badge', cell: (p) => <span className="text-xs md:text-sm text-gray-600">{methodLabel(p.method)}{p.note ? <span className="text-xs text-gray-400"> · {p.note}</span> : null}</span> },
    { key: 'time', header: 'Hora', cell: (p) => <span className="text-gray-500">{fDateTime(p.createdAt)}</span> },
    { key: 'order', header: 'Orden', cell: (p) => <Link to={`/work-orders/${p.workOrderId}`} className="font-medium text-brand-700">{p.workOrder?.orderNumber}</Link> },
    { key: 'client', header: 'Cliente', cell: (p) => <span>{p.workOrder?.customer?.firstName} {p.workOrder?.customer?.lastName}</span> },
    { key: 'by', header: 'Recibió', cell: (p) => <span className="text-gray-500">{p.receivedByName || '—'}</span> },
  ]}
/>
{preview.payments.length === 0 && <p className="px-4 py-8 text-center text-gray-400 text-sm">No hay cobros en este periodo.</p>}
            </div>
          </>
        )}
      </section>

      <section className="space-y-3 print:hidden">
        <h2 className="font-display font-bold text-gray-900">Cortes anteriores</h2>
        <div className="card overflow-hidden">
          <ResponsiveTable
  rows={history?.data || []}
  columns={[
    { key: 'period', header: 'Periodo', mobile: 'title', cell: (c) => <div className="text-gray-600 text-sm">{fDateTime(c.fromAt)} → {fDateTime(c.toAt)}{c.notes ? <p className="text-xs text-gray-400">{c.notes}</p> : null}</div> },
    { key: 'total', header: 'Total', align: 'right', mobile: 'badge', cell: (c) => <span className="font-bold text-gray-900">{fMoney(c.totals.total)}</span> },
    { key: 'cash', header: 'Efectivo', align: 'right', cell: (c) => fMoney(c.totals.CASH) },
    { key: 'card', header: 'Tarjeta', align: 'right', cell: (c) => fMoney(c.totals.CARD) },
    { key: 'transfer', header: 'Transf.', align: 'right', cell: (c) => fMoney(c.totals.TRANSFER) },
    { key: 'diff', header: 'Diferencia', align: 'right', cell: (c) => <span className={c.difference && Number(c.difference) !== 0 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>{c.difference === null ? '—' : fMoney(c.difference)}</span> },
    { key: 'by', header: 'Realizó', cell: (c) => <span className="text-gray-500">{c.closedByName || '—'}</span> },
  ]}
/>
{(history?.data || []).length === 0 && <p className="px-4 py-6 text-center text-gray-400 text-sm">Sin cortes todavía.</p>}
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
