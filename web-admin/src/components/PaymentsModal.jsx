import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { addWOPayment, removeWOPayment, updateWOTotal } from '../services/workOrders';
import { fMoney, fDateTime } from '../utils/formatters';
import { useToast } from '../hooks/useToast';

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
];
export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m;

export default function PaymentsModal({ open, onClose, order, workshopId, isAdmin, onChanged }) {
  const toast = useToast();
  const total = Number(order.totalAmount || 0);
  const paid = Number(order.paidAmount || 0);
  const balance = Math.max(0, total - paid);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [newTotal, setNewTotal] = useState('');

  const done = (msg) => { onChanged(); toast.success(msg); };
  const fail = (e) => toast.error(e.message || 'Ocurrió un error');

  const addMut = useMutation({
    mutationFn: () => addWOPayment(workshopId, order.id, { amount: Number(amount), method, note: note || undefined }),
    onSuccess: () => { setAmount(''); setNote(''); done('Pago registrado'); },
    onError: fail,
  });
  const delMut = useMutation({
    mutationFn: (pid) => removeWOPayment(workshopId, order.id, pid),
    onSuccess: () => done('Pago eliminado'),
    onError: fail,
  });
  const totalMut = useMutation({
    mutationFn: () => updateWOTotal(workshopId, order.id, Number(newTotal)),
    onSuccess: () => { setNewTotal(''); done('Total actualizado'); },
    onError: fail,
  });

  const valid = Number(amount) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Cobros de la orden" size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Total</p><p className="font-bold">{fMoney(total)}</p></div>
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Pagado</p><p className="font-bold text-emerald-800">{fMoney(paid)}</p></div>
          <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-700">Saldo</p><p className="font-bold text-amber-800">{fMoney(balance)}</p></div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) addMut.mutate(); }}
          className="space-y-3 rounded-xl border border-gray-200 p-4"
        >
          <p className="text-sm font-semibold text-gray-800">Registrar cobro</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto (MXN)" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select label="Método" options={PAYMENT_METHODS} value={method} onChange={(e) => setMethod(e.target.value)} />
          </div>
          <Input label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. anticipo, folio de terminal…" />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" disabled={balance <= 0} onClick={() => setAmount(String(balance))}>Liquidar saldo</Button>
            <Button type="submit" loading={addMut.isPending} disabled={!valid}>Registrar cobro</Button>
          </div>
        </form>

        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Historial de cobros</p>
          {!order.payments?.length ? (
            <p className="text-xs text-gray-400">Aún no hay cobros.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {order.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{fMoney(p.amount)} <span className="text-xs font-normal text-gray-500">· {methodLabel(p.method)}</span></p>
                    <p className="text-xs text-gray-400 truncate">{fDateTime(p.createdAt)}{p.note ? ` · ${p.note}` : ''}</p>
                  </div>
                  {isAdmin && (
                    <button type="button" onClick={() => delMut.mutate(p.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Eliminar (solo administrador)">
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 p-3">
          <p className="text-xs text-gray-500 mb-2">El total se calcula con refacciones + cotizaciones aprobadas. Si necesitas corregirlo manualmente:</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input label="Nuevo total (MXN)" type="number" step="0.01" min="0" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} />
            </div>
            <Button variant="secondary" disabled={newTotal === ''} loading={totalMut.isPending} onClick={() => totalMut.mutate()}>Aplicar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
