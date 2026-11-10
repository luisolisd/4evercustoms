import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import ConfirmDialog from './ui/ConfirmDialog';
import { decideQuote } from '../services/reminders';
import { useToast } from '../hooks/useToast';

/**
 * Cierra el seguimiento de una cotización sin respuesta: el cliente la confirmó (aprobada)
 * o se cancela. Pide confirmación antes de aplicar el cambio.
 *  compact: solo iconos (dashboard); si no, icono + texto
 */
export default function QuoteDecision({ reminder, workshopId, compact = false, onDone }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [decision, setDecision] = useState(null); // 'APPROVED' | 'REJECTED'

  const mut = useMutation({
    mutationFn: (d) => decideQuote(workshopId, reminder.id, d),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Listo');
      ['reminders', 'dashboard', 'quotes', 'work-order'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setDecision(null);
      onDone?.();
    },
    onError: (e) => { toast.error(e.message || 'No se pudo aplicar'); setDecision(null); },
  });

  const base = compact
    ? 'p-2.5 rounded'
    : 'inline-flex items-center gap-1.5 rounded-md border px-3.5 min-h-[40px] sm:min-h-0 sm:py-1.5 text-sm font-medium';
  const num = reminder.quote?.quoteNumber || '';

  return (
    <>
      <button
        type="button"
        onClick={() => setDecision('APPROVED')}
        title="El cliente confirmó la cotización"
        className={clsx(base, compact ? 'text-emerald-600 hover:bg-emerald-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50')}
      >
        <Check size={compact ? 16 : 15} />{!compact && 'Confirmada'}
      </button>
      <button
        type="button"
        onClick={() => setDecision('REJECTED')}
        title="Cancelar la cotización"
        className={clsx(base, compact ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'border-gray-200 text-red-600 hover:bg-red-50')}
      >
        <X size={compact ? 16 : 15} />{!compact && 'Cancelar cotización'}
      </button>

      <ConfirmDialog
        open={!!decision}
        onClose={() => setDecision(null)}
        onConfirm={() => mut.mutate(decision)}
        loading={mut.isPending}
        variant={decision === 'APPROVED' ? 'success' : 'danger'}
        title={decision === 'APPROVED' ? 'Confirmar cotización' : 'Cancelar cotización'}
        message={decision === 'APPROVED'
          ? `¿El cliente confirmó la cotización ${num}? Se marcará como aprobada y se sumará al total de la orden.`
          : `¿Cancelar la cotización ${num}? Quedará como rechazada y dejará de contar en la orden.`}
      />
    </>
  );
}
