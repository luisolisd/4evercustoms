import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench, UserX, CalendarClock, CalendarCheck, BellRing, PackageCheck, AlertTriangle, MessageCircle,
  Check, X, RefreshCw, ChevronRight, Camera, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import { getDashboard } from '../services/dashboard';
import { getLowStock } from '../services/inventory';
import { updateAppStatus } from '../services/appointments';
import { contactReminder } from '../services/reminders';
import { getWorkshop } from '../services/workshop';
import { WorkOrderBadge } from '../components/ui/Badge';
import AssignTechniciansModal from '../components/AssignTechniciansModal';
import { useState } from 'react';
import { WORK_ORDER_FLOW } from '../constants/statuses';
import { waLink } from '../utils/whatsapp';
import { useToast } from '../hooks/useToast';
import { fDate } from '../utils/formatters';

const IN_SHOP_STEPS = WORK_ORDER_FLOW.slice(0, 5); // Recibido → Pruebas finales

const TONES = {
  brand:  { box: 'bg-brand-50 text-brand-600', ring: 'ring-brand-200' },
  red:    { box: 'bg-red-50 text-red-600', ring: 'ring-red-200' },
  amber:  { box: 'bg-amber-50 text-amber-600', ring: 'ring-amber-200' },
  blue:   { box: 'bg-blue-50 text-blue-600', ring: 'ring-blue-200' },
  purple: { box: 'bg-purple-50 text-purple-600', ring: 'ring-purple-200' },
  green:  { box: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-200' },
};

function Kpi({ icon: Icon, label, value, hint, tone = 'brand', alert = false, to }) {
  const body = (
    <div className={clsx('card p-4 h-full transition hover:shadow-md', alert && 'ring-1 ' + TONES[tone].ring)}>
      <div className="flex items-start justify-between">
        <div className={clsx('p-2 rounded-xl', TONES[tone].box)}><Icon size={18} /></div>
        {alert && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 leading-none">{value ?? '–'}</p>
      <p className="mt-1.5 text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

function Section({ title, subtitle, to, linkLabel = 'Ver todo', right, children }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-gray-900 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {right}
        {to && <Link to={to} className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-0.5 shrink-0">{linkLabel} <ChevronRight size={14} /></Link>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ text }) => <p className="px-5 py-8 text-center text-sm text-gray-400">{text}</p>;

function Technicians({ list, onAssign }) {
  if (!list?.length) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onAssign?.(); }}
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 px-2.5 py-0.5 text-xs font-semibold hover:bg-amber-100"
      >
        <UserX size={12} /> Asignar
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {list.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 pl-0.5 pr-2.5 py-0.5 text-xs font-medium text-gray-700">
          <span className="h-5 w-5 rounded-full bg-gray-800 text-white text-[10px] font-bold flex items-center justify-center">{t.firstName?.[0]}{t.lastName?.[0]}</span>
          {t.firstName}
        </span>
      ))}
    </div>
  );
}

function StageBar({ status }) {
  const idx = Math.max(0, IN_SHOP_STEPS.indexOf(status));
  return (
    <div className="flex gap-1 mt-1.5" aria-hidden>
      {IN_SHOP_STEPS.map((s, i) => <span key={s} className={clsx('h-1 flex-1 rounded-full', i <= idx ? 'bg-brand-500' : 'bg-gray-200')} />)}
    </div>
  );
}

const dayLabel = (iso) => {
  const d = new Date(iso);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t0.getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
};
const timeLabel = (iso) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

function AppointmentRow({ a, actions }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="w-16 shrink-0 text-center">
        <p className="text-[11px] font-semibold uppercase text-gray-400">{dayLabel(a.scheduledAt)}</p>
        <p className="text-base font-bold text-gray-900 leading-tight">{timeLabel(a.scheduledAt)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{a.customer?.firstName} {a.customer?.lastName}</p>
        <p className="text-xs text-gray-500 truncate">{a.serviceType} · {a.vehicle?.make} {a.vehicle?.model} {a.vehicle?.year}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">{actions}</div>
    </div>
  );
}

export default function DashboardPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [assigning, setAssigning] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', workshopId],
    queryFn: () => getDashboard(workshopId).then((r) => r.data),
    enabled: !!workshopId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock', workshopId],
    queryFn: () => getLowStock(workshopId).then((r) => r.data),
    enabled: !!workshopId,
  });
  const { data: workshop } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => getWorkshop(workshopId).then((r) => r.data),
    enabled: !!workshopId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['dashboard', workshopId] });
  const fail = (e) => toast.error(e.message || 'Ocurrió un error');

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateAppStatus(workshopId, id, status),
    onSuccess: (_, v) => { refresh(); toast.success(v.status === 'CONFIRMED' ? 'Cita confirmada' : 'Cita cancelada'); },
    onError: fail,
  });
  const contactMut = useMutation({ mutationFn: (id) => contactReminder(workshopId, id), onSuccess: refresh, onError: fail });

  const c = data?.counts;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  const whatsappAppointment = (a) => {
    const when = `${dayLabel(a.scheduledAt).toLowerCase()} a las ${timeLabel(a.scheduledAt)}`;
    const url = waLink(a.customer?.phone, `Hola ${a.customer?.firstName}, te saluda ${workshop?.name || 'el taller'}. ¿Nos confirmas tu cita de ${a.serviceType} para ${when}? ¡Gracias!`);
    if (!url) return toast.error('El cliente no tiene un teléfono válido');
    window.open(url, '_blank', 'noopener');
  };
  const whatsappReminder = (r) => {
    if (!r.whatsappUrl) return toast.error('El cliente no tiene un teléfono válido');
    window.open(r.whatsappUrl, '_blank', 'noopener');
    contactMut.mutate(r.id);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 capitalize">{today}</p>
          <h1 className="page-title">{greeting}, {user?.firstName}</h1>
          <p className="page-subtitle">Resumen operativo del taller{workshop?.name ? ` · ${workshop.name}` : ''}</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          {data?.generatedAt ? `Actualizado ${timeLabel(data.generatedAt)}` : 'Actualizar'}
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={Wrench} tone="brand" label="En el taller" value={c?.inWork} hint={c?.late ? `${c.late} con entrega vencida` : 'vehículos en servicio'} to="/work-orders" alert={!!c?.late} />
        <Kpi icon={UserX} tone="red" label="Sin técnico" value={c?.unassigned} hint="requieren asignación" alert={!!c?.unassigned} to="/work-orders" />
        <Kpi icon={CalendarClock} tone="blue" label="Por ingresar" value={c?.toEnter} hint={`${c?.toEnterToday ?? 0} hoy · próximos 7 días`} to="/appointments" />
        <Kpi icon={CalendarCheck} tone="amber" label="Citas por confirmar" value={c?.toConfirm} hint="pendientes de respuesta" alert={!!c?.toConfirm} to="/appointments" />
        <Kpi icon={BellRing} tone="purple" label="Recordatorios" value={c?.reminders} hint={c?.remindersOverdue ? `${c.remindersOverdue} vencidos` : 'próximos 14 días'} to="/reminders" alert={!!c?.remindersOverdue} />
        <Kpi icon={PackageCheck} tone="green" label="Listos para entrega" value={c?.readyForPickup} hint="esperando al cliente" to="/work-orders" />
      </div>

      {/* Servicios en trabajo */}
      <Section
        title="Servicios en trabajo"
        subtitle={c?.awaitingAuth ? `${c.awaitingAuth} esperando autorización del cliente` : 'Vehículos que están actualmente en el taller'}
        to="/work-orders"
      >
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-7 w-7 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : !data?.inWork.length ? (
          <Empty text="No hay vehículos en servicio en este momento." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5">Orden</th>
                  <th className="text-left px-5 py-2.5">Vehículo / cliente</th>
                  <th className="text-left px-5 py-2.5 w-52">Estatus</th>
                  <th className="text-left px-5 py-2.5">Técnico(s)</th>
                  <th className="text-left px-5 py-2.5">Fotos</th>
                  <th className="text-left px-5 py-2.5">En taller</th>
                  <th className="text-left px-5 py-2.5">Entrega estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.inWork.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-gray-900">{o.orderNumber}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{o.vehicle?.year} {o.vehicle?.make} {o.vehicle?.model}{o.vehicle?.licensePlate ? <span className="ml-1.5 text-xs font-normal text-gray-400">{o.vehicle.licensePlate}</span> : null}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[260px]">{o.customer?.firstName} {o.customer?.lastName}{o.description ? ` · ${o.description}` : ''}</p>
                    </td>
                    <td className="px-5 py-3.5"><WorkOrderBadge status={o.status} /><StageBar status={o.status} /></td>
                    <td className="px-5 py-3.5"><Technicians list={o.technicians} onAssign={() => setAssigning(o)} /></td>
                    <td className="px-5 py-3.5">
                      {o.photos.total ? (
                        <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', o.photos.done === o.photos.total ? 'text-emerald-600' : 'text-gray-500')}>
                          <Camera size={13} /> {o.photos.done}/{o.photos.total}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{o.daysInShop === 0 ? 'Hoy' : `${o.daysInShop} d`}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {o.estimatedReady ? (
                        <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', o.late ? 'text-red-600' : 'text-gray-600')}>
                          <Clock size={13} /> {fDate(o.estimatedReady)}{o.late ? ' · vencida' : ''}
                        </span>
                      ) : <span className="text-xs text-gray-300">Sin fecha</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Por ingresar */}
        <Section title="Por ingresar" subtitle="Citas confirmadas · próximos 7 días" to="/appointments">
          {!data?.toEnter.length ? <Empty text="No hay citas confirmadas próximas." /> : (
            <div className="divide-y divide-gray-50">
              {data.toEnter.map((a) => <AppointmentRow key={a.id} a={a} actions={
                <button onClick={() => whatsappAppointment(a)} title="WhatsApp" className="p-2 rounded-lg text-[#25D366] hover:bg-emerald-50"><MessageCircle size={16} /></button>
              } />)}
            </div>
          )}
        </Section>

        {/* Confirmar cita */}
        <Section title="Confirmar cita" subtitle="Pendientes de confirmación" to="/appointments">
          {!data?.toConfirm.length ? <Empty text="No hay citas pendientes por confirmar." /> : (
            <div className="divide-y divide-gray-50">
              {data.toConfirm.map((a) => <AppointmentRow key={a.id} a={a} actions={
                <>
                  <button onClick={() => whatsappAppointment(a)} title="Preguntar por WhatsApp" className="p-2 rounded-lg text-[#25D366] hover:bg-emerald-50"><MessageCircle size={16} /></button>
                  <button onClick={() => statusMut.mutate({ id: a.id, status: 'CONFIRMED' })} disabled={statusMut.isPending} title="Confirmar" className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"><Check size={16} /></button>
                  <button onClick={() => statusMut.mutate({ id: a.id, status: 'CANCELLED' })} disabled={statusMut.isPending} title="Cancelar" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><X size={16} /></button>
                </>
              } />)}
            </div>
          )}
        </Section>

        {/* Recordatorios */}
        <Section title="Recordatorios" subtitle="Próximo servicio · vencidos y siguientes 14 días" to="/reminders">
          {!data?.reminders.length ? <Empty text="No hay recordatorios por atender." /> : (
            <div className="divide-y divide-gray-50">
              {data.reminders.map((r) => {
                const overdue = new Date(r.dueDate) < new Date();
                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.customer?.firstName} {r.customer?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{r.serviceType}{r.vehicle ? ` · ${r.vehicle.make} ${r.vehicle.model}` : ''}</p>
                      <p className={clsx('text-xs', overdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                        {overdue ? 'Venció ' : ''}{fDate(r.dueDate)}{r.status === 'CONTACTED' ? ' · mensaje enviado' : ''}
                      </p>
                    </div>
                    <button onClick={() => whatsappReminder(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white px-3 py-1.5 text-xs font-semibold hover:brightness-95 shrink-0">
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Inventario bajo */}
      {lowStock?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm"><AlertTriangle size={16} /> Stock bajo en {lowStock.length} refacción(es)</div>
          <div className="flex flex-wrap gap-2 flex-1">
            {lowStock.slice(0, 6).map((i) => (
              <span key={i.id} className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 ring-1 ring-amber-200">{i.part?.name} · <b className="text-amber-700">{Number(i.quantity)}</b></span>
            ))}
          </div>
          <Link to="/inventory" className="text-xs font-semibold text-amber-800 underline">Ver inventario</Link>
        </div>
      )}

      <AssignTechniciansModal open={!!assigning} onClose={() => setAssigning(null)} order={assigning} onSaved={refresh} />
    </div>
  );
}
