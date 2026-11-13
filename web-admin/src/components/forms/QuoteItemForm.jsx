import { useState, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { getParts } from '../../services/inventory';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../hooks/useToast';

const EMPTY = { name: '', quantity: '1', unitPrice: '' };

/**
 * Línea de cotización: se elige si es refacción o mano de obra y se escribe directamente su nombre.
 * Si lo escrito coincide con una refacción del inventario, se toma su precio (y se liga a ella).
 */
export default function QuoteItemForm({ onSubmit, loading, initial, submitLabel = 'Agregar línea', onCancel }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const toast = useToast();
  const listId = useId();
  // `initial` = línea existente a editar; sin ella, el formulario agrega líneas nuevas
  const [labor, setLabor] = useState(!!initial?.isLabor);
  const [f, setF] = useState(initial
    ? { name: initial.description || '', quantity: String(Number(initial.quantity)), unitPrice: String(Number(initial.unitPrice)) }
    : EMPTY);

  const { data: partsRes } = useQuery({
    queryKey: ['parts-all', workshopId],
    queryFn: () => getParts(workshopId, { limit: 200 }),
    enabled: !!workshopId,
  });
  const parts = partsRes?.data || [];

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const matchPart = (name) => (labor ? null : parts.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) || null);

  const onName = (e) => {
    const name = e.target.value;
    const part = matchPart(name);
    setF((s) => ({ ...s, name, ...(part ? { unitPrice: String(Number(part.unitPrice)) } : {}) }));
  };

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = f.name.trim();
    const quantity = Number(f.quantity);
    const unitPrice = f.unitPrice === '' ? 0 : Number(f.unitPrice);
    if (!name) return toast.error(labor ? 'Escribe la mano de obra' : 'Escribe la refacción');
    if (!(quantity > 0)) return toast.error('La cantidad debe ser mayor a 0');
    if (Number.isNaN(unitPrice) || unitPrice < 0) return toast.error('El precio no es válido');
    const part = matchPart(name);
    onSubmit(
      { description: name, partId: part?.id || undefined, quantity, unitPrice, isLabor: labor },
      () => { if (!initial) setF(EMPTY); }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">
        {[{ v: false, t: 'Refacción' }, { v: true, t: 'Mano de obra' }].map((o) => (
          <button
            key={o.t}
            type="button"
            onClick={() => setLabor(o.v)}
            className={clsx(
              'min-h-[44px] sm:min-h-0 sm:py-2 rounded text-sm font-semibold transition',
              labor === o.v ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {o.t}
          </button>
        ))}
      </div>

      <div>
        <Input
          label={labor ? 'Mano de obra *' : 'Refacción *'}
          placeholder={labor ? 'Ej. Cambio de balatas' : 'Ej. Filtro de aceite (escribe o elige del inventario)'}
          list={labor ? undefined : listId}
          autoComplete="off"
          value={f.name}
          onChange={onName}
        />
        {!labor && (
          <datalist id={listId}>
            {parts.map((p) => <option key={p.id} value={p.name}>{`$${Number(p.unitPrice).toFixed(2)}${p.sku ? ` · ${p.sku}` : ''}`}</option>)}
          </datalist>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Cantidad *" type="number" step="0.01" inputMode="decimal" value={f.quantity} onChange={set('quantity')} />
        <Input label="Precio unit. (IVA incl.) *" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.unitPrice} onChange={set('unitPrice')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" className={onCancel ? '' : 'w-full sm:w-auto'} loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  );
}
