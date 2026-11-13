import { useState, useRef } from 'react';
import { IVA_FACTOR } from '../constants/tax';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, Plus, Trash2, ChevronRight, DollarSign,
  Clock, Car, Edit2, Eye, FileDown, ClipboardList,
} from 'lucide-react';
import { getWorkshop } from '../services/workshop';
import {
  getWorkOrder, updateWOStatus, addWOPart, removeWOPart,
  uploadWOPhotos, deletePhoto, updateWorkOrder, linkQuoteToOrder,
} from '../services/workOrders';
import { getParts } from '../services/inventory';
import { addQuoteItem, removeQuoteItem, createQuote, updateQuoteStatus, getQuotes } from '../services/quotes';
import { useAuthStore, selectIsAdmin } from '../store/authStore';
import PaymentsModal from '../components/PaymentsModal';
import PhotoSlotsPanel from '../components/PhotoSlotsPanel';
import DamagePanel from '../components/DamagePanel';
import OrderProgress from '../components/OrderProgress';
import { ReceptionDataPanel, ReceptionSignature } from '../components/ReceptionPanels';
import AssignTechniciansModal from '../components/AssignTechniciansModal';
import NextServiceModal from '../components/NextServiceModal';
import { compressImage } from '../utils/image';
import { WorkOrderBadge, PaymentBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import QuoteItemForm from '../components/forms/QuoteItemForm';
import EditQuoteItemModal from '../components/EditQuoteItemModal';
import { useToast } from '../hooks/useToast';
import { fMoney, fDate, fDateTime, fNumber, toLocalInput, fromLocalInput } from '../utils/formatters';
import clsx from 'clsx';
import { WORK_ORDER_FLOW_OPTS } from '../constants/statuses';
import { useForm } from 'react-hook-form';

const STATUSES = WORK_ORDER_FLOW_OPTS;

const STATUS_IDX = Object.fromEntries(STATUSES.map((s, i) => [s.value, i]));

function StatusStepper({ current, onSelect, loading }) {
  const curIdx = STATUS_IDX[current] ?? 0;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STATUSES.map((s, i) => (
        <button
          key={s.value}
          disabled={loading}
          onClick={() => onSelect(s.value)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all',
            s.value === current
              ? 'bg-brand-600 text-white shadow-sm'
              : i < curIdx
              ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          )}
        >
          <span>{i + 1}</span>
          {s.label}
          {i < STATUSES.length - 1 && <ChevronRight size={10} className="opacity-50" />}
        </button>
      ))}
    </div>
  );
}

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const photoInput = useRef();
  const isAdmin = useAuthStore(selectIsAdmin);

  const [searchParams] = useSearchParams();
  const initialTab = { recepcion: 'reception', fotos: 'photos' }[searchParams.get('tab')] || 'info';
  const [tab, setTab] = useState(initialTab);
  const [assignModal, setAssignModal] = useState(false);
  const [nextServiceModal, setNextServiceModal] = useState(false);
  const [addPartModal, setAddPartModal] = useState(false);
  const [quoteModal, setQuoteModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [removePart, setRemovePart] = useState(null);
  const [selectedPart, setSelectedPart] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partDesc, setPartDesc] = useState('');
  const [partPrice, setPartPrice] = useState('');

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => getWorkOrder(workshopId, id),
    enabled: !!workshopId,
  });

  const order = orderRes?.data;

  const { data: partsRes } = useQuery({
    queryKey: ['parts-all', workshopId],
    queryFn: () => getParts(workshopId, { limit: 200 }),
    enabled: !!workshopId,
  });
  const allParts = partsRes?.data || [];

  const { data: workshopRes } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => getWorkshop(workshopId),
    enabled: !!workshopId,
  });

  const [pdfBusy, setPdfBusy] = useState(false);
  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      const { downloadWorkOrderPdf } = await import('../pdf/WorkOrderPDF');
      await downloadWorkOrderPdf(order, workshopRes?.data || {});
    } catch { toast.error('No se pudo generar el PDF'); }
    finally { setPdfBusy(false); }
  };

  // Cotización en PDF (mismo formato que la orden) para enviarla al cliente y que la autorice
  const [quotePdfBusy, setQuotePdfBusy] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // { qid, item }
  const handleQuotePdf = async (q) => {
    setQuotePdfBusy(q.id);
    try {
      const { downloadQuotePdf } = await import('../pdf/QuotePDF');
      await downloadQuotePdf(q, workshopRes?.data || {}, { vehicle: order.vehicle, customer: order.customer });
    } catch { toast.error('No se pudo generar el PDF de la cotización'); }
    finally { setQuotePdfBusy(null); }
  };

  // Orden de recepción (formato impreso del taller); "Recibió" es quien la genera
  const user = useAuthStore((s) => s.user);
  const [recBusy, setRecBusy] = useState(false);
  const handleReceptionPdf = async () => {
    setRecBusy(true);
    try {
      const { downloadReceptionOrderPdf } = await import('../pdf/ReceptionOrderPDF');
      await downloadReceptionOrderPdf(order, workshopRes?.data || {}, `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
    } catch { toast.error('No se pudo generar la orden de recepción'); }
    finally { setRecBusy(false); }
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['work-order', id] });

  const statusMut  = useMutation({ mutationFn: (s) => updateWOStatus(workshopId, id, s), onSuccess: (_, s) => { invalidate(); toast.success('Estado actualizado'); if (s === 'DELIVERED') setNextServiceModal(true); }, onError: (e) => toast.error(e.message) });
  const photoMut   = useMutation({ mutationFn: (fd) => uploadWOPhotos(workshopId, id, fd), onSuccess: () => { invalidate(); toast.success('Fotos subidas'); }, onError: (e) => toast.error(e.message || 'Error al subir fotos') });
  const delPhotoMut= useMutation({ mutationFn: (pid) => deletePhoto(workshopId, pid), onSuccess: () => { invalidate(); toast.success('Foto eliminada'); }, onError: (e) => toast.error(e.message || 'No se pudo eliminar') });
  const resetPartForm = () => { setSelectedPart(''); setPartQty(1); setPartDesc(''); setPartPrice(''); };
  const addPartMut = useMutation({
    // Refacción del inventario o concepto escrito a mano (descripción + precio)
    mutationFn: () => addWOPart(workshopId, id, {
      partId: selectedPart || undefined,
      description: partDesc.trim() || undefined,
      quantity: partQty,
      unitPrice: partPrice === '' ? undefined : Number(partPrice),
    }),
    onSuccess: () => { invalidate(); setAddPartModal(false); resetPartForm(); toast.success('Línea agregada'); },
    onError: (e) => toast.error(e.message),
  });
  const removePartMut = useMutation({ mutationFn: (lineId) => removeWOPart(workshopId, id, lineId), onSuccess: () => { invalidate(); setRemovePart(null); toast.success('Refacción removida'); }, onError: (e) => toast.error(e.message || 'No se pudo remover') });

  const addQuoteMut = useMutation({
    mutationFn: (d) => createQuote(workshopId, { customerId: order.customerId, workOrderId: order.id, ...d }),
    onSuccess: () => { invalidate(); setQuoteModal(false); toast.success('Cotización creada'); },
    onError: (e) => toast.error(e.message),
  });

  const { data: unlinkedRes } = useQuery({
    queryKey: ['unlinked-quotes', workshopId, order?.customerId],
    queryFn: () => getQuotes(workshopId, { customerId: order.customerId, unlinked: true, limit: 50 }),
    enabled: !!workshopId && !!order?.customerId && linkModal,
  });
  const unlinkedQuotes = unlinkedRes?.data || [];

  const linkQuoteMut = useMutation({
    mutationFn: (quoteId) => linkQuoteToOrder(workshopId, id, quoteId),
    onSuccess: () => { invalidate(); setLinkModal(false); toast.success('Cotización vinculada'); },
    onError: (e) => toast.error(e.message || 'Error al vincular'),
  });

  const addQuoteItemMut = useMutation({
    mutationFn: ({ qid, data }) => addQuoteItem(workshopId, qid, data),
    onSuccess: () => { invalidate(); toast.success('Línea agregada'); },
    onError: (e) => toast.error(e.message),
  });

  const quoteStatusMut = useMutation({
    mutationFn: ({ qid, status }) => updateQuoteStatus(workshopId, qid, status),
    onSuccess: () => { invalidate(); toast.success('Cotización actualizada'); },
    onError: (e) => toast.error(e.message || 'No se pudo actualizar'),
  });

  const removeQuoteItemMut = useMutation({
    mutationFn: ({ qid, itemId }) => removeQuoteItem(workshopId, qid, itemId),
    onSuccess: () => { invalidate(); toast.success('Ítem removido'); },
  });

  const phaseRef = useRef('RECEPTION');
  const pickPhotos = (phase) => { phaseRef.current = phase; photoInput.current.click(); };
  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append('photos', await compressImage(f));
    fd.append('phase', phaseRef.current);
    photoMut.mutate(fd);
  };

  const editForm = useForm({ values: order ? { diagnosis: order.diagnosis, recommendations: order.recommendations, technicianNotes: order.technicianNotes, estimatedReady: toLocalInput(order.estimatedReady), } : {} });
  const editMut = useMutation({
    mutationFn: (d) => updateWorkOrder(workshopId, id, { ...d, estimatedReady: fromLocalInput(d.estimatedReady) }),
    onSuccess: () => { invalidate(); setEditModal(false); toast.success('Orden actualizada'); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-24"><div className="animate-spin h-10 w-10 rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  if (!order) return null;

  const canAddPart = partQty > 0 && (selectedPart || partDesc.trim()) && partPrice !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Volver a órdenes
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <WorkOrderBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus} />
            </div>
            <p className="text-gray-500 mt-1">Recibido {fDateTime(order.receivedAt)}{order.technicians?.length ? ` · Técnico(s): ${order.technicians.map((t) => `${t.firstName} ${t.lastName}`).join(', ')}` : ' · Sin técnico asignado'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {order.status === 'DELIVERED' && (
              <Button variant="secondary" icon={Clock} size="sm" onClick={() => setNextServiceModal(true)}>Próximo servicio</Button>
            )}
            <Button variant="secondary" icon={ClipboardList} size="sm" loading={recBusy} onClick={handleReceptionPdf}>Orden de recepción</Button>
            <Button variant="secondary" icon={FileDown} size="sm" loading={pdfBusy} onClick={handlePdf}>PDF</Button>
            <Button variant="secondary" icon={DollarSign} size="sm" onClick={() => setPayModal(true)}>Cobros</Button>
            <Button variant="secondary" icon={Edit2} size="sm" onClick={() => setEditModal(true)}>Editar</Button>
          </div>
        </div>
      </div>

      {/* Avance de la orden: se actualiza solo con notas, fotos y cotizaciones */}
      <div className="bg-white rounded-md p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avance de la orden</p>
          <span className="text-[11px] text-gray-400">Avanza solo con notas, fotos y cotizaciones</span>
        </div>
        <OrderProgress status={order.status} flow={order.flow} />
        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-semibold text-brand-600 hover:text-brand-700">Cambiar estatus manualmente</summary>
          <div className="mt-3">
            <StatusStepper current={order.status} onSelect={(s) => statusMut.mutate(s)} loading={statusMut.isPending} />
          </div>
        </details>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-md p-5 shadow-sm border border-gray-200 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              {order.customer?.firstName[0]}{order.customer?.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{order.customer?.firstName} {order.customer?.lastName}</p>
              <p className="text-sm text-gray-500">{order.customer?.phone}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-5 shadow-sm border border-gray-200 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehículo</p>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-md"><Car size={18} className="text-gray-500" /></div>
            <div>
              <p className="font-semibold text-gray-900">{order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}</p>
              <p className="text-sm text-gray-500">{order.vehicle?.licensePlate || 'Sin placa'}{order.mileageIn ? ` · ${fNumber(order.mileageIn)} km` : ''}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-5 shadow-sm border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Técnico(s)</p>
            <button onClick={() => setAssignModal(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              {order.technicians?.length ? 'Cambiar' : 'Asignar'}
            </button>
          </div>
          {order.technicians?.length ? (
            <div className="flex flex-wrap gap-2">
              {order.technicians.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded bg-gray-100 pl-1 pr-3 py-1 text-sm font-medium text-gray-800">
                  <span className="h-6 w-6 rounded-full bg-gray-800 text-white text-[10px] font-bold flex items-center justify-center">{t.firstName?.[0]}{t.lastName?.[0]}</span>
                  {t.firstName} {t.lastName}
                </span>
              ))}
            </div>
          ) : (
            <button onClick={() => setAssignModal(true)} className="w-full rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100">
              Sin técnico · Asignar ahora
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
          {['info', 'reception', 'photos', 'parts', 'quotes'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 shrink-0 whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors',
                tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {{ info: 'Información', reception: 'Recepción', photos: 'Fotos del técnico', parts: `Refacciones (${order.workOrderParts?.length ?? 0})`, quotes: `Cotizaciones (${order.quotes?.length ?? 0})` }[t]}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* INFO */}
          {tab === 'info' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: fMoney(order.totalAmount), icon: DollarSign },
                { label: 'Pagado', value: fMoney(order.paidAmount), icon: DollarSign },
                { label: 'Entrega estimada', value: order.estimatedReady ? fDate(order.estimatedReady) : '—', icon: Clock },
                { label: 'Entregado', value: order.deliveredAt ? fDate(order.deliveredAt) : '—', icon: Clock },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-md p-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="font-bold text-gray-900">{item.value}</p>
                </div>
              ))}
              {order.description && (
                <div className="col-span-full bg-gray-50 rounded-md p-4">
                  <p className="text-xs text-gray-500 mb-1">Servicio</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.description}</p>
                </div>
              )}
              {order.diagnosis && (
                <div className="col-span-full bg-gray-50 rounded-md p-4">
                  <p className="text-xs text-gray-500 mb-1">Observaciones / Diagnóstico</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.diagnosis}</p>
                </div>
              )}
              {order.recommendations && (
                <div className="col-span-full bg-gray-50 rounded-md p-4">
                  <p className="text-xs text-gray-500 mb-1">Recomendaciones</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.recommendations}</p>
                </div>
              )}
              {order.technicianNotes && (
                <div className="col-span-full bg-amber-50 border border-amber-100 rounded-md p-4">
                  <p className="text-xs text-amber-700 mb-1">Notas del técnico (internas)</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.technicianNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* PARTS */}
          {tab === 'parts' && (
            <div>
              <div className="flex justify-end mb-4">
                <Button icon={Plus} size="sm" onClick={() => setAddPartModal(true)}>Agregar refacción</Button>
              </div>
              {!order.workOrderParts?.length ? (
                <p className="text-center text-gray-400 py-8 text-sm">No hay refacciones agregadas</p>
              ) : (
                <>
                <ResponsiveTable
  rows={order.workOrderParts}
  columns={[
    { key: 'part', header: 'Refacción', mobile: 'title', cell: (p) => <span className="font-medium">{p.part?.name || p.description}<span className="block text-xs text-gray-400 font-normal">{p.part?.sku}</span></span> },
    { key: 'qty', header: 'Cant.', align: 'right', cell: (p) => p.quantity },
    { key: 'pu', header: 'P.U.', align: 'right', cell: (p) => fMoney(Number(p.unitPrice) / IVA_FACTOR) },
    { key: 'total', header: 'Total', align: 'right', cell: (p) => <span className="font-bold">{fMoney(Number(p.total) / IVA_FACTOR)}</span> },
  ]}
  actions={(p, { mobile }) => (
    <button onClick={() => setRemovePart(p)} className={mobile ? 'inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3.5 min-h-[40px] text-sm text-red-600' : 'p-1 text-gray-400 hover:text-red-600'}>
      <Trash2 size={14} />{mobile && 'Quitar'}
    </button>
  )}
/>
{(() => {
  const totalIva = order.workOrderParts.reduce((s, p) => s + Number(p.total), 0); // ya incluye IVA
  const subtotal = totalIva / IVA_FACTOR;
  return (
    <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
      <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="text-gray-700">{fMoney(subtotal)}</span></div>
      <div className="flex justify-between text-gray-500"><span>IVA (16%)</span><span className="text-gray-700">{fMoney(totalIva - subtotal)}</span></div>
      <div className="flex justify-between font-semibold text-gray-700"><span>Total refacciones (IVA incl.)</span><span className="font-bold text-lg text-gray-900">{fMoney(totalIva)}</span></div>
    </div>
  );
})()}
                </>
              )}
            </div>
          )}

          {/* RECEPCIÓN: cómo llega el vehículo (supervisor/admin) */}
          {tab === 'reception' && (
            <div className="space-y-8">
              <ReceptionDataPanel order={order} workshopId={workshopId} locked={!!order.receptionSignedAt} onChanged={invalidate} />
              <PhotoSlotsPanel order={order} workshopId={workshopId} kind="RECEPTION" title="Fotos de recepción (obligatorias)" canDelete={!order.receptionSignedAt} locked={!!order.receptionSignedAt} onChanged={invalidate} />
              <DamagePanel order={order} workshopId={workshopId} canDelete={!order.receptionSignedAt} locked={!!order.receptionSignedAt} onChanged={invalidate} />
              <ReceptionSignature order={order} workshopId={workshopId} isAdmin={isAdmin} onChanged={invalidate} />
            </div>
          )}

          {/* FOTOS DEL TÉCNICO + entrega */}
          {tab === 'photos' && (
            <div className="space-y-8">
              <PhotoSlotsPanel order={order} workshopId={workshopId} kind="TECH" title="Fotos que debe registrar el técnico" canEditSlots canDelete onChanged={invalidate} />
              <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
              <PhotoSection
                title="Entrega — cómo se entrega el vehículo"
                photos={(order.photos || []).filter((p) => p.phase === 'DELIVERY')}
                onUpload={() => pickPhotos('DELIVERY')}
                loading={photoMut.isPending}
                onDelete={(id) => delPhotoMut.mutate(id)}
              />
            </div>
          )}

          {/* QUOTES */}
          {tab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setLinkModal(true)}>Vincular existente</Button>
                <Button icon={Plus} size="sm" onClick={() => setQuoteModal(true)}>Nueva cotización</Button>
              </div>
              {!order.quotes?.length ? (
                <p className="text-center text-gray-400 py-8 text-sm">No hay cotizaciones</p>
              ) : (
                order.quotes.map((q) => (
                  <div key={q.id} className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-900">{q.quoteNumber}</span>
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', {
                          DRAFT:'bg-gray-100 text-gray-700', SENT:'bg-blue-100 text-blue-700',
                          APPROVED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-700',
                        }[q.status] || 'bg-gray-100')}>{q.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{fMoney(q.total)}</span>
                        <Button size="xs" variant="secondary" icon={FileDown} loading={quotePdfBusy === q.id} onClick={() => handleQuotePdf(q)}>PDF</Button>
                        {q.status === 'DRAFT' && (
                          <Button size="xs" variant="secondary" onClick={() => quoteStatusMut.mutate({ qid: q.id, status: 'SENT' })}>Enviar</Button>
                        )}
                        {q.status === 'SENT' && (
                          <>
                            <Button size="xs" variant="success" onClick={() => quoteStatusMut.mutate({ qid: q.id, status: 'APPROVED' })}>Aprobar</Button>
                            <Button size="xs" variant="danger" onClick={() => quoteStatusMut.mutate({ qid: q.id, status: 'REJECTED' })}>Rechazar</Button>
                          </>
                        )}
                      </div>
                    </div>
                    <ResponsiveTable
  rows={q.items || []}
  columns={[
    { key: 'd', header: 'Descripción', mobile: 'title', cell: (item) => <span>{item.description}{item.isLabor && <span className="ml-1 text-gray-400">(M.O.)</span>}</span> },
    { key: 'q', header: 'Cant.', align: 'right', cell: (item) => item.quantity },
    { key: 'pu', header: 'P.U.', align: 'right', cell: (item) => fMoney(Number(item.unitPrice) / IVA_FACTOR) },
    { key: 't', header: 'Total', align: 'right', cell: (item) => <span className="font-semibold">{fMoney(Number(item.total) / IVA_FACTOR)}</span> },
  ]}
  actions={(item, { mobile }) => (
    <span className={mobile ? 'inline-flex gap-2' : 'inline-flex items-center gap-3'}>
      {['DRAFT','SENT'].includes(q.status) && (
        <button onClick={() => setEditingItem({ qid: q.id, item })} title="Editar" className={mobile ? 'inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3.5 min-h-[40px] text-sm text-gray-700' : 'text-gray-400 hover:text-brand-600'}>
          <Edit2 size={13} />{mobile && 'Editar'}
        </button>
      )}
      <button onClick={() => removeQuoteItemMut?.mutate({ qid: q.id, itemId: item.id })} title="Quitar" className={mobile ? 'inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3.5 min-h-[40px] text-sm text-red-600' : 'text-gray-400 hover:text-red-500'}>
        <Trash2 size={13} />{mobile && 'Quitar'}
      </button>
    </span>
  )}
/>
<div className="px-4 py-3 ml-auto max-w-xs space-y-0.5 text-xs">
  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="text-gray-700">{fMoney(Number(q.total) / IVA_FACTOR)}</span></div>
  <div className="flex justify-between text-gray-500"><span>IVA (16%)</span><span className="text-gray-700">{fMoney(Number(q.total) - Number(q.total) / IVA_FACTOR)}</span></div>
  <div className="flex justify-between font-bold text-sm text-gray-900"><span>Total (IVA incl.)</span><span>{fMoney(q.total)}</span></div>
</div>
                    {['DRAFT','SENT'].includes(q.status) && (
                      <div className="px-4 pb-4">
                        <QuoteItemForm onSubmit={(d, done) => addQuoteItemMut.mutate({ qid: q.id, data: d }, { onSuccess: done })} loading={addQuoteItemMut.isPending} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <EditQuoteItemModal
        item={editingItem?.item}
        quoteId={editingItem?.qid}
        onClose={() => setEditingItem(null)}
        invalidateKeys={[['work-order', id]]}
      />

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar orden" size="md">
        <form onSubmit={editForm.handleSubmit((d) => editMut.mutate(d))} className="space-y-4">
          <Textarea label="Observaciones / Diagnóstico (PDF)" rows={3} {...editForm.register('diagnosis')} />
          <Textarea label="Recomendaciones (PDF)" rows={3} {...editForm.register('recommendations')} />
          <Textarea label="Notas del técnico (internas)" rows={2} {...editForm.register('technicianNotes')} />
          <Input label="Entrega estimada" type="datetime-local" {...editForm.register('estimatedReady')} />
          <div className="flex justify-end"><Button type="submit" loading={editMut.isPending}>Guardar</Button></div>
        </form>
      </Modal>

      <NextServiceModal open={nextServiceModal} onClose={() => setNextServiceModal(false)} order={order} workshopId={workshopId} />

      <AssignTechniciansModal open={assignModal} onClose={() => setAssignModal(false)} order={order} onSaved={invalidate} />

      <PaymentsModal
        open={payModal}
        onClose={() => setPayModal(false)}
        order={order}
        workshopId={workshopId}
        isAdmin={isAdmin}
        onChanged={invalidate}
      />

      {/* Add part modal */}
      <Modal open={addPartModal} onClose={() => { setAddPartModal(false); resetPartForm(); }} title="Agregar refacción o concepto" size="sm">
        <form
          onSubmit={(e) => { e.preventDefault(); if (canAddPart) addPartMut.mutate(); }}
          className="space-y-4"
        >
          <Select
            label="Refacción del inventario (opcional)"
            placeholder="Ninguna: escribiré el concepto"
            options={allParts.map((p) => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — ${fMoney(p.unitPrice)}` }))}
            value={selectedPart}
            onChange={(e) => {
              const part = allParts.find((p) => p.id === e.target.value);
              setSelectedPart(e.target.value);
              setPartDesc(part ? part.name : '');
              setPartPrice(part ? String(Number(part.unitPrice)) : '');
            }}
          />
          <Input
            label="Descripción *"
            placeholder="Nombre del concepto o pieza"
            value={partDesc}
            onChange={(e) => setPartDesc(e.target.value)}
            maxLength={300}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cantidad" type="number" min={0.01} step="any" value={partQty} onChange={(e) => setPartQty(Number(e.target.value))} />
            <Input label="Precio unit. (IVA incl.) *" type="number" min={0} step="0.01" value={partPrice} onChange={(e) => setPartPrice(e.target.value)} />
          </div>
          {partPrice !== '' && (
            <p className="text-sm text-gray-600">
              P.U. (sin IVA): <strong>{fMoney(Number(partPrice) / IVA_FACTOR)}</strong>
              {' · '}Total (IVA incl.): <strong>{fMoney(Number(partPrice) * partQty)}</strong>
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setAddPartModal(false); resetPartForm(); }}>Cancelar</Button>
            <Button type="submit" loading={addPartMut.isPending} disabled={!canAddPart}>Agregar</Button>
          </div>
        </form>
      </Modal>

      {/* Remove part confirm */}
      <ConfirmDialog
        open={!!removePart}
        onClose={() => setRemovePart(null)}
        onConfirm={() => removePartMut.mutate(removePart?.id)}
        loading={removePartMut.isPending}
        title="Remover refacción"
        message={`¿Remover "${removePart?.part?.name || removePart?.description}" de esta orden?`}
      />

      {/* New quote modal */}
      <Modal open={quoteModal} onClose={() => setQuoteModal(false)} title="Nueva cotización" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Se creará una cotización en estado Borrador para esta orden de trabajo. Podrás agregar líneas de detalle directamente.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setQuoteModal(false)}>Cancelar</Button>
            <Button onClick={() => addQuoteMut.mutate({})} loading={addQuoteMut.isPending}>Crear cotización</Button>
          </div>
        </div>
      </Modal>

      {/* Link existing quote modal */}
      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Vincular cotización existente" size="md">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Cotizaciones de este cliente que aún no están ligadas a una orden:</p>
          {unlinkedQuotes.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No hay cotizaciones sin orden para este cliente.</p>
          ) : unlinkedQuotes.map((q) => (
            <div key={q.id} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono font-medium text-sm text-gray-900">{q.quoteNumber}</p>
                <p className="text-xs text-gray-500">{q.status} · {fMoney(q.total)} · {q._count?.items ?? 0} líneas</p>
              </div>
              <Button size="xs" loading={linkQuoteMut.isPending} onClick={() => linkQuoteMut.mutate(q.id)}>Vincular</Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function PhotoSection({ title, photos, onUpload, loading, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{title} <span className="text-gray-400 font-normal">({photos.length})</span></p>
        <Button icon={Camera} size="sm" variant="secondary" onClick={onUpload} loading={loading}>Subir fotos</Button>
      </div>
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-md">
          <Camera size={28} className="mb-2 opacity-30" />
          <p className="text-xs">Sin fotos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-md overflow-hidden aspect-square bg-gray-100">
              <img src={p.thumbnailUrl || p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a href={p.url} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded text-white hover:bg-white/30"><Eye size={14} /></a>
                <button onClick={() => onDelete(p.id)} className="p-2 bg-white/20 rounded text-white hover:bg-red-500/50"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


