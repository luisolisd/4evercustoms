import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  getQuotes, createQuote, updateQuoteStatus,
  addQuoteItem, removeQuoteItem, deleteQuote,
} from '../services/quotes';
import { getCustomers } from '../services/customers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import QuoteItemForm from '../components/forms/QuoteItemForm';
import { QuoteBadge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { fMoney, fDate } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT',    label: 'Borrador' },
  { value: 'SENT',     label: 'Enviada' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'REJECTED', label: 'Rechazada' },
];

function QuoteRow({ quote, workshopId, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['quotes', workshopId] });

  const statusMut = useMutation({
    mutationFn: (status) => updateQuoteStatus(workshopId, quote.id, status),
    onSuccess: () => { invalidate(); toast.success('Estado actualizado'); },
    onError: (e) => toast.error(e.message),
  });

  const addItemMut = useMutation({
    mutationFn: (data) => addQuoteItem(workshopId, quote.id, data),
    onSuccess: () => { invalidate(); toast.success('Ítem agregado'); },
    onError: (e) => toast.error(e.message),
  });

  const removeItemMut = useMutation({
    mutationFn: (itemId) => removeQuoteItem(workshopId, quote.id, itemId),
    onSuccess: () => { invalidate(); toast.success('Ítem removido'); },
  });

  const editable = ['DRAFT', 'SENT'].includes(quote.status);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {expanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
          <span className="font-mono font-bold text-gray-900 shrink-0">{quote.quoteNumber}</span>
          <QuoteBadge status={quote.status} />
          <span className="text-sm text-gray-500 truncate">{quote.customer?.firstName} {quote.customer?.lastName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm text-gray-400 hidden sm:block">{fDate(quote.createdAt)}</span>
          <span className="font-bold text-gray-900">{fMoney(quote.total)}</span>
          <div className="flex gap-1">
            {quote.status === 'DRAFT' && (
              <Button size="xs" variant="secondary" onClick={() => statusMut.mutate('SENT')}>Enviar</Button>
            )}
            {quote.status === 'SENT' && (
              <>
                <Button size="xs" variant="success" onClick={() => statusMut.mutate('APPROVED')}>Aprobar</Button>
                <Button size="xs" variant="danger" onClick={() => statusMut.mutate('REJECTED')}>Rechazar</Button>
              </>
            )}
            <button onClick={() => onDelete(quote)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-2">Descripción</th>
                <th className="text-right px-4 py-2">Cant.</th>
                <th className="text-right px-4 py-2">P.U.</th>
                <th className="text-right px-4 py-2">Desc.</th>
                <th className="text-right px-4 py-2">Total</th>
                {editable && <th className="px-4 py-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(!quote.items || quote.items.length === 0) && (
                <tr><td colSpan={editable ? 6 : 5} className="text-center py-5 text-gray-400">Sin ítems aún</td></tr>
              )}
              {quote.items?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {item.description}
                    {item.isLabor && <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">M.O.</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right">{fMoney(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-right">{item.discount > 0 ? `${item.discount}%` : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fMoney(item.total)}</td>
                  {editable && (
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => removeItemMut.mutate(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-4 py-2 text-right text-gray-500 font-medium">Subtotal</td>
                <td className={clsx('px-4 py-2 text-right', editable && 'pr-4')}>{fMoney(quote.subtotal)}</td>
                {editable && <td />}
              </tr>
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-4 py-1 text-right text-gray-500 font-medium">IVA 16%</td>
                <td className={clsx('px-4 py-1 text-right', editable && 'pr-4')}>{fMoney(quote.tax)}</td>
                {editable && <td />}
              </tr>
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-4 pb-3 pt-1 text-right font-bold text-gray-900">Total</td>
                <td className={clsx('px-4 pb-3 pt-1 text-right font-bold text-gray-900 text-sm', editable && 'pr-4')}>{fMoney(quote.total)}</td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>

          {editable && (
            <div className="border-t border-gray-100 px-4 pb-5 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Agregar ítem</p>
              <QuoteItemForm onSubmit={(d) => addItemMut.mutate(d)} loading={addItemMut.isPending} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuotesPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', workshopId, statusFilter, search, page],
    queryFn: () => getQuotes(workshopId, { status: statusFilter || undefined, search, page, limit: 10 }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });

  const quotes = data?.data || [];
  const pagination = data?.pagination;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['quotes', workshopId] });

  const { data: cusRes } = useQuery({
    queryKey: ['customers-list', workshopId],
    queryFn: () => getCustomers(workshopId, { limit: 200 }),
    enabled: !!workshopId,
  });
  const customers = cusRes?.data || [];

  const form = useForm({ defaultValues: { customerId: '', validUntil: '', notes: '' } });

  const createMut = useMutation({
    mutationFn: (d) => createQuote(workshopId, d),
    onSuccess: () => { invalidate(); setCreateModal(false); form.reset(); toast.success('Cotización creada'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteQuote(workshopId, id),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Cotización eliminada'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination?.total ?? 0} cotizaciones</p>
        </div>
        <Button icon={Plus} onClick={() => setCreateModal(true)}>Nueva cotización</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar por número, cliente..." className="flex-1 min-w-[200px] max-w-sm" />
        <Select options={STATUS_OPTS} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-[200px]" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
      ) : quotes.length === 0 ? (
        <EmptyState icon={FileText} title="No hay cotizaciones" description="Crea la primera cotización." action="Nueva cotización" onAction={() => setCreateModal(true)} />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <QuoteRow key={q.id} quote={q} workshopId={workshopId} onDelete={setDeleting} />
          ))}
          {pagination && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <Pagination {...pagination} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nueva cotización" size="md">
        <form onSubmit={form.handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <Select
            label="Cliente"
            placeholder="Seleccionar cliente"
            options={customers.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} · ${c.phone}` }))}
            error={form.formState.errors.customerId?.message}
            {...form.register('customerId', { required: 'Requerido' })}
          />
          <Input label="Válida hasta" type="date" {...form.register('validUntil')} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button type="submit" loading={createMut.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMut.mutate(deleting?.id)}
        loading={deleteMut.isPending}
        title="Eliminar cotización"
        message={`¿Eliminar cotización ${deleting?.quoteNumber}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
