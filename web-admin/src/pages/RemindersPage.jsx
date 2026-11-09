import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Plus, MessageCircle, CheckCheck, Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import {
  getReminders, createReminder, contactReminder, setReminderStatus, deleteReminder,
} from '../services/reminders';
import { getCustomers } from '../services/customers';
import { getVehicles } from '../services/vehicles';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import SearchInput from '../components/ui/SearchInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import QuoteDecision from '../components/QuoteDecision';
import { NewCustomerButton, NewVehicleButton } from '../components/QuickCreate';
import { SERVICES } from '../constants/services';
import { fDate, fMoney } from '../utils/formatters';

const VIEWS = [
  { key: 'overdue', label: 'Vencidos' },
  { key: 'upcoming', label: 'Próximos 30 días' },
  { key: 'later', label: 'Más adelante' },
  { key: 'closed', label: 'Cerrados' },
];

const STATUS = {
  PENDING: { label: 'Por contactar', color: 'yellow' },
  CONTACTED: { label: 'Mensaje enviado', color: 'blue' },
  CONFIRMED: { label: 'Confirmado', color: 'green' },
  DONE: { label: 'Realizado', color: 'teal' },
  CANCELLED: { label: 'Cancelado', color: 'gray' },
};

const EMPTY = { customerId: '', vehicleId: '', service: SERVICES[0], other: '', dueDate: '', nextMileage: '', notes: '' };

export default function RemindersPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [view, setView] = useState('upcoming');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ['reminders', workshopId, view, type, search, page],
    queryFn: () => getReminders(workshopId, { view, type: type || undefined, search: search || undefined, page, limit: 15 }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });
  const rows = data?.data || [];
  const pagination = data?.pagination;

  const { data: customers } = useQuery({
    queryKey: ['customers-all', workshopId],
    queryFn: () => getCustomers(workshopId, { limit: 500 }).then((r) => r.data),
    enabled: !!workshopId && modal,
  });
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-customer', form.customerId],
    queryFn: () => getVehicles(workshopId, { customerId: form.customerId, limit: 50 }).then((r) => r.data),
    enabled: !!form.customerId && modal,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['reminders', workshopId] });
  const fail = (e) => toast.error(e.message || 'Ocurrió un error');

  const createMut = useMutation({
    mutationFn: () => createReminder(workshopId, {
      customerId: form.customerId,
      vehicleId: form.vehicleId || undefined,
      serviceType: form.service === 'Otro' ? form.other.trim() : form.service,
      dueDate: new Date(`${form.dueDate}T12:00:00`).toISOString(),
      nextMileage: form.nextMileage ? Number(form.nextMileage) : undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { refresh(); setModal(false); setForm(EMPTY); toast.success('Recordatorio creado'); },
    onError: fail,
  });
  const contactMut = useMutation({ mutationFn: (id) => contactReminder(workshopId, id), onSuccess: refresh, onError: fail });
  const statusMut = useMutation({
    mutationFn: ({ id, status }) => setReminderStatus(workshopId, id, status),
    onSuccess: refresh,
    onError: fail,
  });
  const delMut = useMutation({
    mutationFn: (id) => deleteReminder(workshopId, id),
    onSuccess: () => { refresh(); setDeleting(null); toast.success('Recordatorio eliminado'); },
    onError: fail,
  });

  // Un clic: abre WhatsApp con el mensaje listo y registra el contacto
  const sendWhatsApp = (r) => {
    if (!r.whatsappUrl) return toast.error('El cliente no tiene un teléfono válido');
    window.open(r.whatsappUrl, '_blank', 'noopener');
    if (['PENDING', 'CONTACTED'].includes(r.status)) contactMut.mutate(r.id);
  };

  const formValid = form.customerId && form.dueDate && (form.service !== 'Otro' || form.other.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Seguimiento</p>
          <h1 className="page-title">Recordatorios</h1>
          <p className="page-subtitle">Próximos servicios y cotizaciones sin confirmar: avisa al cliente por WhatsApp con un clic</p>
        </div>
        <Button icon={Plus} onClick={() => { setForm(EMPTY); setModal(true); }}>Nuevo</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => { setView(v.key); setPage(1); }}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition', view === v.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {[['', 'Todos'], ['SERVICE', 'Servicios'], ['QUOTE', 'Cotizaciones']].map(([k, l]) => (
            <button key={k} onClick={() => { setType(k); setPage(1); }}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition', type === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {l}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar cliente o teléfono…" className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm" />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={BellRing} title="Sin recordatorios" description="Crea uno para dar seguimiento al próximo servicio de un cliente." />
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((r) => {
              const st = STATUS[r.status];
              const isOpen = !['DONE', 'CANCELLED'].includes(r.status);
              const overdue = isOpen && new Date(r.dueDate) < new Date();
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-semibold text-gray-900">{r.customer?.firstName} {r.customer?.lastName}</p>
                    <p className="text-sm text-gray-600">{r.serviceType}{r.type === 'QUOTE' && r.quote ? ` · ${fMoney(r.quote.total)}` : ''}{r.vehicle ? ` · ${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.year}` : ''}</p>
                    <p className={clsx('text-xs', overdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                      {overdue ? 'Venció el ' : r.type === 'QUOTE' ? 'Dar seguimiento el ' : 'Programado para '}{fDate(r.dueDate)}{r.nextMileage ? ` · ${r.nextMileage.toLocaleString('es-MX')} km` : ''}{r.notes ? ` · ${r.notes}` : ''}
                    </p>
                  </div>
                  {r.type === 'QUOTE' && <Badge color="blue" square>Cotización</Badge>}
                  <Badge color={st.color}>{st.label}</Badge>
                  {isOpen && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => sendWhatsApp(r)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-semibold hover:brightness-95">
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                      {r.type === 'QUOTE' ? (
                        r.quote?.status === 'SENT' && <QuoteDecision reminder={r} workshopId={workshopId} />
                      ) : (
                        <>
                          {r.status !== 'CONFIRMED' && (
                            <button onClick={() => statusMut.mutate({ id: r.id, status: 'CONFIRMED' })} title="Marcar como confirmado"
                              className="p-2.5 sm:p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"><Check size={18} /></button>
                          )}
                          <button onClick={() => statusMut.mutate({ id: r.id, status: 'DONE' })} title="Marcar como realizado"
                            className="p-2.5 sm:p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50"><CheckCheck size={18} /></button>
                        </>
                      )}
                    </div>
                  )}
                  <button onClick={() => setDeleting(r)} title="Eliminar" className="p-2.5 sm:p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              );
            })}
          </div>
        )}
        {pagination && <Pagination {...pagination} onPageChange={setPage} />}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo recordatorio" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (formValid) createMut.mutate(); }} className="space-y-4">
          <Select
            label="Cliente *" placeholder="Seleccionar cliente"
            labelAction={<NewCustomerButton onCreated={(c) => setForm((f) => ({ ...f, customerId: c.id, vehicleId: '' }))} />}
            options={(customers || []).map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} — ${c.phone}` }))}
            value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, vehicleId: '' }))}
          />
          <Select
            label="Vehículo"
            labelAction={<NewVehicleButton customerId={form.customerId} onCreated={(v) => setForm((f) => ({ ...f, vehicleId: v.id }))} />}
            placeholder={form.customerId ? 'Seleccionar vehículo (opcional)' : 'Primero elige un cliente'} disabled={!form.customerId}
            options={(vehicles || []).map((v) => ({ value: v.id, label: `${v.year} ${v.make} ${v.model}${v.licensePlate ? ` (${v.licensePlate})` : ''}` }))}
            value={form.vehicleId} onChange={set('vehicleId')}
          />
          <Select label="Servicio *" options={SERVICES.map((s) => ({ value: s, label: s }))} value={form.service} onChange={set('service')} />
          {form.service === 'Otro' && <Input label="Especifica el servicio *" value={form.other} onChange={set('other')} maxLength={100} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fecha del próximo servicio *" type="date" value={form.dueDate} onChange={set('dueDate')} />
            <Input label="Kilometraje estimado" type="number" min="0" value={form.nextMileage} onChange={set('nextMileage')} placeholder="Ej. 15000" />
          </div>
          <Textarea label="Notas" rows={2} value={form.notes} onChange={set('notes')} placeholder="Ej. toca a los 10,000 km" />
          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" loading={createMut.isPending} disabled={!formValid}>Crear recordatorio</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => delMut.mutate(deleting.id)}
        loading={delMut.isPending}
        title="Eliminar recordatorio"
        message={`¿Eliminar el recordatorio de ${deleting?.customer?.firstName} ${deleting?.customer?.lastName}?`}
      />
    </div>
  );
}
