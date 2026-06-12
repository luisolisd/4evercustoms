import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Plus, Trash2, ChevronRight, DollarSign,
  Clock, Car, Edit2, Eye, FileDown,
} from 'lucide-react';
import { getWorkshop } from '../services/workshop';
import {
  getWorkOrder, updateWOStatus, addWOPart, removeWOPart,
  uploadWOPhotos, deletePhoto, updateWorkOrder, updateWOPayment,
} from '../services/workOrders';
import { getParts } from '../services/inventory';
import { addQuoteItem, removeQuoteItem, createQuote, updateQuoteStatus } from '../services/quotes';
import { useAuthStore } from '../store/authStore';
import { WorkOrderBadge, PaymentBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import QuoteItemForm from '../components/forms/QuoteItemForm';
import { useToast } from '../hooks/useToast';
import { fMoney, fDate, fDateTime, fNumber } from '../utils/formatters';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';

const STATUSES = [
  { value: 'RECEIVED',         label: 'Recibido' },
  { value: 'DIAGNOSIS',        label: 'Diagnóstico' },
  { value: 'AWAITING_AUTH',    label: 'Esp. autorización' },
  { value: 'IN_REPAIR',        label: 'En reparación' },
  { value: 'FINAL_TESTING',    label: 'Pruebas finales' },
  { value: 'READY_FOR_PICKUP', label: 'Listo para entrega' },
  { value: 'DELIVERED',        label: 'Entregado' },
];

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
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
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

  const [tab, setTab] = useState('info');
  const [addPartModal, setAddPartModal] = useState(false);
  const [quoteModal, setQuoteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [removePart, setRemovePart] = useState(null);
  const [selectedPart, setSelectedPart] = useState('');
  const [partQty, setPartQty] = useState(1);

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
    } catch (e) { toast.error('No se pudo generar el PDF'); }
    finally { setPdfBusy(false); }
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['work-order', id] });

  const statusMut  = useMutation({ mutationFn: (s) => updateWOStatus(workshopId, id, s), onSuccess: () => { invalidate(); toast.success('Estado actualizado'); }, onError: (e) => toast.error(e.message) });
  const photoMut   = useMutation({ mutationFn: (fd) => uploadWOPhotos(workshopId, id, fd), onSuccess: () => { invalidate(); toast.success('Fotos subidas'); }, onError: (e) => toast.error('Error al subir fotos') });
  const delPhotoMut= useMutation({ mutationFn: (pid) => deletePhoto(workshopId, pid), onSuccess: () => { invalidate(); toast.success('Foto eliminada'); } });
  const addPartMut = useMutation({
    mutationFn: () => {
      const part = allParts.find((p) => p.id === selectedPart);
      return addWOPart(workshopId, id, { partId: selectedPart, quantity: partQty, unitPrice: Number(part.unitPrice) });
    },
    onSuccess: () => { invalidate(); setAddPartModal(false); setSelectedPart(''); setPartQty(1); toast.success('Refacción agregada'); },
    onError: (e) => toast.error(e.message),
  });
  const removePartMut = useMutation({ mutationFn: (pid) => removeWOPart(workshopId, id, pid), onSuccess: () => { invalidate(); setRemovePart(null); toast.success('Refacción removida'); } });

  const addQuoteMut = useMutation({
    mutationFn: (d) => createQuote(workshopId, { customerId: order.customerId, workOrderId: order.id, ...d }),
    onSuccess: () => { invalidate(); setQuoteModal(false); toast.success('Cotización creada'); },
    onError: (e) => toast.error(e.message),
  });

  const addQuoteItemMut = useMutation({
    mutationFn: ({ qid, data }) => addQuoteItem(workshopId, qid, data),
    onSuccess: () => { invalidate(); toast.success('Línea agregada'); },
    onError: (e) => toast.error(e.message),
  });

  const quoteStatusMut = useMutation({
    mutationFn: ({ qid, status }) => updateQuoteStatus(workshopId, qid, status),
    onSuccess: () => { invalidate(); toast.success('Cotización actualizada'); },
  });

  const removeQuoteItemMut = useMutation({
    mutationFn: ({ qid, itemId }) => removeQuoteItem(workshopId, qid, itemId),
    onSuccess: () => { invalidate(); toast.success('Ítem removido'); },
  });

  const phaseRef = useRef('RECEPTION');
  const pickPhotos = (phase) => { phaseRef.current = phase; photoInput.current.click(); };
  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    fd.append('phase', phaseRef.current);
    photoMut.mutate(fd);
    e.target.value = '';
  };

  const editForm = useForm({ values: order ? { diagnosis: order.diagnosis, recommendations: order.recommendations, technicianNotes: order.technicianNotes, estimatedReady: order.estimatedReady?.slice(0,16) } : {} });
  const editMut = useMutation({
    mutationFn: (d) => updateWorkOrder(workshopId, id, d),
    onSuccess: () => { invalidate(); setEditModal(false); toast.success('Orden actualizada'); },
    onError: (e) => toast.error(e.message),
  });

  const payForm = useForm({ values: order ? { totalAmount: Number(order.totalAmount), paidAmount: Number(order.paidAmount) } : {} });
  const payMut = useMutation({
    mutationFn: (d) => updateWOPayment(workshopId, id, d),
    onSuccess: () => { invalidate(); setPayModal(false); toast.success('Pago actualizado'); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-24"><div className="animate-spin h-10 w-10 rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  if (!order) return null;

  const selectedPartData = allParts.find((p) => p.id === selectedPart);

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
            <p className="text-gray-500 mt-1">Recibido {fDateTime(order.receivedAt)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" icon={FileDown} size="sm" loading={pdfBusy} onClick={handlePdf}>PDF</Button>
            <Button variant="secondary" icon={DollarSign} size="sm" onClick={() => setPayModal(true)}>Registrar pago</Button>
            <Button variant="secondary" icon={Edit2} size="sm" onClick={() => setEditModal(true)}>Editar</Button>
          </div>
        </div>
      </div>

      {/* Status stepper */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estatus del vehículo</p>
        <StatusStepper current={order.status} onSelect={(s) => statusMut.mutate(s)} loading={statusMut.isPending} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehículo</p>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-xl"><Car size={18} className="text-gray-500" /></div>
            <div>
              <p className="font-semibold text-gray-900">{order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}</p>
              <p className="text-sm text-gray-500">{order.vehicle?.licensePlate || 'Sin placa'}{order.mileageIn ? ` · ${fNumber(order.mileageIn)} km` : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b">
          {['info', 'parts', 'photos', 'quotes'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-3.5 text-sm font-medium transition-colors',
                tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {{ info: 'Información', parts: `Refacciones (${order.workOrderParts?.length ?? 0})`, photos: `Fotos (${order.photos?.length ?? 0})`, quotes: `Cotizaciones (${order.quotes?.length ?? 0})` }[t]}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* INFO */}
          {tab === 'info' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: fMoney(order.totalAmount), icon: DollarSign },
                { label: 'Pagado', value: fMoney(order.paidAmount), icon: DollarSign },
                { label: 'Entrega estimada', value: order.estimatedReady ? fDate(order.estimatedReady) : '—', icon: Clock },
                { label: 'Entregado', value: order.deliveredAt ? fDate(order.deliveredAt) : '—', icon: Clock },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="font-bold text-gray-900">{item.value}</p>
                </div>
              ))}
              {order.description && (
                <div className="col-span-full bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Descripción del problema (Falla)</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.description}</p>
                </div>
              )}
              {order.diagnosis && (
                <div className="col-span-full bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Observaciones / Diagnóstico</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.diagnosis}</p>
                </div>
              )}
              {order.recommendations && (
                <div className="col-span-full bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Recomendaciones</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{order.recommendations}</p>
                </div>
              )}
              {order.technicianNotes && (
                <div className="col-span-full bg-amber-50 border border-amber-100 rounded-xl p-4">
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
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[520px]">
                  <thead><tr className="text-gray-500 text-xs uppercase border-b"><th className="text-left py-2">Refacción</th><th className="text-right py-2">Cant.</th><th className="text-right py-2">P.U.</th><th className="text-right py-2">Total</th><th className="py-2" /></tr></thead>
                  <tbody className="divide-y">
                    {order.workOrderParts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 font-medium">{p.part?.name}<span className="text-xs text-gray-400 ml-2">{p.part?.sku}</span></td>
                        <td className="py-3 text-right">{p.quantity}</td>
                        <td className="py-3 text-right">{fMoney(Number(p.unitPrice) / 1.16)}</td>
                        <td className="py-3 text-right font-bold">{fMoney(Number(p.total) / 1.16)}</td>
                        <td className="py-3 text-right">
                          <button onClick={() => setRemovePart(p)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const totalIva = order.workOrderParts.reduce((s, p) => s + Number(p.total), 0); // ya incluye IVA
                      const subtotal = totalIva / 1.16;
                      return (
                        <>
                          <tr><td colSpan={3} className="pt-4 text-right text-gray-500">Subtotal</td><td className="pt-4 text-right text-gray-700">{fMoney(subtotal)}</td><td /></tr>
                          <tr><td colSpan={3} className="py-0.5 text-right text-gray-500">IVA (16%)</td><td className="py-0.5 text-right text-gray-700">{fMoney(totalIva - subtotal)}</td><td /></tr>
                          <tr><td colSpan={3} className="pb-4 pt-1 text-right font-semibold text-gray-700">Total refacciones (IVA incl.)</td><td className="pb-4 pt-1 text-right font-bold text-lg text-gray-900">{fMoney(totalIva)}</td><td /></tr>
                        </>
                      );
                    })()}
                  </tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* PHOTOS */}
          {tab === 'photos' && (
            <div className="space-y-8">
              <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
              <PhotoSection
                title="Recepción — cómo llega el vehículo"
                photos={(order.photos || []).filter((p) => p.phase !== 'DELIVERY')}
                onUpload={() => pickPhotos('RECEPTION')}
                loading={photoMut.isPending}
                onDelete={(id) => delPhotoMut.mutate(id)}
              />
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
              <div className="flex justify-end">
                <Button icon={Plus} size="sm" onClick={() => setQuoteModal(true)}>Nueva cotización</Button>
              </div>
              {!order.quotes?.length ? (
                <p className="text-center text-gray-400 py-8 text-sm">No hay cotizaciones</p>
              ) : (
                order.quotes.map((q) => (
                  <div key={q.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-900">{q.quoteNumber}</span>
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', {
                          DRAFT:'bg-gray-100 text-gray-700', SENT:'bg-blue-100 text-blue-700',
                          APPROVED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-700',
                        }[q.status] || 'bg-gray-100')}>{q.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{fMoney(q.total)}</span>
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
                    <div className="overflow-x-auto"><table className="w-full text-xs min-w-[480px]">
                      <thead><tr className="text-gray-400 border-b"><th className="text-left px-4 py-2">Descripción</th><th className="text-right px-4 py-2">Cant.</th><th className="text-right px-4 py-2">P.U.</th><th className="text-right px-4 py-2">Total</th><th className="px-4 py-2" /></tr></thead>
                      <tbody>
                        {q.items?.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{item.description}{item.isLabor && <span className="ml-1 text-gray-400">(M.O.)</span>}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">{fMoney(item.unitPrice)}</td>
                            <td className="px-4 py-2 text-right font-semibold">{fMoney(item.total)}</td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => removeQuoteItemMut?.mutate({ qid: q.id, itemId: item.id })} className="text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold text-sm"><td colSpan={3} className="px-4 py-3 text-right text-gray-900">Total (IVA incl.)</td><td className="px-4 py-3 text-right text-gray-900">{fMoney(q.total)}</td><td /></tr>
                      </tfoot>
                    </table></div>
                    {['DRAFT','SENT'].includes(q.status) && (
                      <div className="px-4 pb-4">
                        <QuoteItemForm onSubmit={(d) => addQuoteItemMut.mutate({ qid: q.id, data: d })} loading={addQuoteItemMut.isPending} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Registrar pago" size="sm">
        <form onSubmit={payForm.handleSubmit((d) => payMut.mutate(d))} className="space-y-4">
          <Input label="Total a cobrar (MXN)" type="number" step="0.01" min="0" {...payForm.register('totalAmount', { valueAsNumber: true })} />
          <Input label="Monto pagado (MXN)" type="number" step="0.01" min="0" {...payForm.register('paidAmount', { valueAsNumber: true })} />
          <p className="text-xs text-gray-500">
            El <b>total</b> se calcula automáticamente con las refacciones + cotizaciones aprobadas; aquí puedes corregirlo manualmente.
            El estatus de pago se deriva: pagado ≥ total → <b>Pagado</b>; pagado &gt; 0 → <b>Parcial</b>; si no, <b>Pendiente</b>. Se le notifica al cliente.
          </p>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary"
              onClick={() => payForm.setValue('paidAmount', payForm.getValues('totalAmount') || 0)}>
              Marcar como pagado
            </Button>
            <Button type="submit" loading={payMut.isPending}>Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Add part modal */}
      <Modal open={addPartModal} onClose={() => setAddPartModal(false)} title="Agregar refacción" size="sm">
        <div className="space-y-4">
          <Select
            label="Refacción"
            placeholder="Seleccionar"
            options={allParts.map((p) => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — ${fMoney(p.unitPrice)}` }))}
            value={selectedPart}
            onChange={(e) => setSelectedPart(e.target.value)}
          />
          <Input label="Cantidad" type="number" min={1} value={partQty} onChange={(e) => setPartQty(Number(e.target.value))} />
          {selectedPartData && (
            <p className="text-sm text-gray-600">
              P.U. (sin IVA): <strong>{fMoney(Number(selectedPartData.unitPrice) / 1.16)}</strong>
              {' · '}Total (IVA incl.): <strong>{fMoney(Number(selectedPartData.unitPrice) * partQty)}</strong>
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddPartModal(false)}>Cancelar</Button>
            <Button onClick={() => addPartMut.mutate()} loading={addPartMut.isPending} disabled={!selectedPart}>Agregar</Button>
          </div>
        </div>
      </Modal>

      {/* Remove part confirm */}
      <ConfirmDialog
        open={!!removePart}
        onClose={() => setRemovePart(null)}
        onConfirm={() => removePartMut.mutate(removePart?.partId)}
        loading={removePartMut.isPending}
        title="Remover refacción"
        message={`¿Remover "${removePart?.part?.name}" de esta orden?`}
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
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Camera size={28} className="mb-2 opacity-30" />
          <p className="text-xs">Sin fotos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100">
              <img src={p.thumbnailUrl || p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a href={p.url} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30"><Eye size={14} /></a>
                <button onClick={() => onDelete(p.id)} className="p-2 bg-white/20 rounded-lg text-white hover:bg-red-500/50"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
