import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PenLine, ShieldCheck, Lock, Fuel } from 'lucide-react';
import clsx from 'clsx';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import ConfirmDialog from './ui/ConfirmDialog';
import SignaturePad from '../pages/customer/SignaturePad';
import { updateWorkOrder, signReception, signAdvisor, clearReceptionSignature } from '../services/workOrders';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { fDateTime } from '../utils/formatters';
import { FUEL_LEVELS, RECEPTION_STATEMENT } from '../constants/reception';

export { FUEL_LEVELS, RECEPTION_STATEMENT };

/** Datos al dejar el vehículo: kilometraje, combustible, pertenencias y anotaciones relevantes. */
export function ReceptionDataPanel({ order, workshopId, locked, onChanged }) {
  const toast = useToast();
  const fromOrder = (o) => ({
    km: o.mileageIn != null ? String(o.mileageIn) : '',
    fuel: o.fuelLevel || '',
    belongings: o.belongings || '',
    notes: o.receptionNotes || '',
  });
  const [f, setF] = useState(fromOrder(order));
  const [base, setBase] = useState(fromOrder(order));

  useEffect(() => { const v = fromOrder(order); setF(v); setBase(v); }, [order.id, order.receptionSignedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(f) !== JSON.stringify(base);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => updateWorkOrder(workshopId, order.id, {
      mileageIn: f.km === '' ? undefined : Number(f.km),
      fuelLevel: f.fuel,
      belongings: f.belongings,
      receptionNotes: f.notes,
    }),
    onSuccess: () => { setBase(f); onChanged(); toast.success('Datos de recepción guardados'); },
    onError: (e) => toast.error(e.message || 'No se pudo guardar'),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Datos de recepción</p>
        <p className="text-xs text-gray-500">Registra cómo llega el vehículo. Se imprimen en la constancia que firma el cliente.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Kilometraje de entrada" type="number" min="0" inputMode="numeric" value={f.km} onChange={set('km')} disabled={locked} placeholder="Ej. 45000" />
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700"><Fuel size={14} className="text-gray-400" /> Nivel de combustible</p>
          <div className="grid grid-cols-5 gap-1">
            {FUEL_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                disabled={locked}
                onClick={() => setF((s) => ({ ...s, fuel: s.fuel === l.value ? '' : l.value }))}
                className={clsx(
                  'min-h-[44px] sm:min-h-0 sm:py-2.5 rounded-md border text-xs font-semibold transition disabled:opacity-60',
                  f.fuel === l.value ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Textarea label="Pertenencias y accesorios que deja el cliente" rows={2} value={f.belongings} onChange={set('belongings')} disabled={locked} placeholder="Ej. llanta de refacción, gato, documentos en guantera, autoestéreo" />
      <Textarea label="Anotaciones relevantes del estado de llegada" rows={3} value={f.notes} onChange={set('notes')} disabled={locked} placeholder="Ej. testigo de motor encendido, ruido al frenar, cliente reporta fuga de aceite" />

      {!locked && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={dirty ? 'text-xs font-medium text-amber-600' : 'text-xs text-gray-400'}>{dirty ? 'Tienes cambios sin guardar' : 'Sin cambios'}</p>
          <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!dirty}>Guardar datos</Button>
        </div>
      )}
    </div>
  );
}

/** Firma digital del cliente: conformidad con el estado en que llegó su vehículo. */
export function ReceptionSignature({ order, workshopId, isAdmin, onChanged }) {
  const toast = useToast();
  const signed = !!order.receptionSignedAt;
  const rec = order.flow?.facts?.reception || { total: 0, done: 0 };
  const missing = Math.max(0, rec.total - rec.done);
  const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customerName);
  const [annul, setAnnul] = useState(false);

  const signMut = useMutation({
    mutationFn: (signature) => signReception(workshopId, order.id, { signature, signedBy: name.trim() }),
    onSuccess: () => { setOpen(false); onChanged(); toast.success('Recepción firmada por el cliente'); },
    onError: (e) => toast.error(e.message || 'No se pudo guardar la firma'),
  });
  // Firma del asesor (administrador o supervisor) que recibe el vehículo
  const user = useAuthStore((s) => s.user);
  const advisorSigned = !!order.advisorSignedAt;
  const [advOpen, setAdvOpen] = useState(false);
  const advMut = useMutation({
    mutationFn: (signature) => signAdvisor(workshopId, order.id, { signature }),
    onSuccess: () => { setAdvOpen(false); onChanged(); toast.success('Firma del asesor guardada'); },
    onError: (e) => toast.error(e.message || 'No se pudo guardar la firma'),
  });
  const clearMut = useMutation({
    mutationFn: () => clearReceptionSignature(workshopId, order.id),
    onSuccess: () => { setAnnul(false); onChanged(); toast.success('Firma anulada: ya se puede corregir la recepción'); },
    onError: (e) => toast.error(e.message || 'No se pudo anular'),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Firma de conformidad de recepción <span className="font-normal text-gray-400">(al dejar el vehículo)</span></p>

      {signed ? (
        <div className="rounded-md border border-emerald-200 border-l-[3px] border-l-emerald-500 bg-emerald-50/50 p-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck size={16} /> Recepción firmada de conformidad</p>
          {order.receptionSignature && (
            <div className="rounded-md border border-gray-200 bg-white p-2 inline-block">
              <img src={order.receptionSignature} alt="Firma del cliente" className="h-24 w-auto max-w-full" />
            </div>
          )}
          <p className="text-xs text-gray-600">
            <b>{order.receptionSignedBy}</b> · {fDateTime(order.receptionSignedAt)}
          </p>
          <p className="text-xs text-gray-500 italic">“{RECEPTION_STATEMENT}”</p>
          <p className="flex items-center gap-1.5 text-xs text-gray-500"><Lock size={12} /> Datos y fotos de recepción bloqueados para conservar el estado en que llegó el vehículo.</p>
          {isAdmin && <button type="button" onClick={() => setAnnul(true)} className="text-xs font-semibold text-red-600 hover:underline">Anular firma (solo administrador)</button>}
        </div>
      ) : (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-xs text-gray-600 italic">“{RECEPTION_STATEMENT}”</p>
          {missing > 0 ? (
            <p className="text-xs rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
              Faltan <b>{missing}</b> foto(s) de recepción. El cliente firma cuando todo el estado del vehículo está documentado.
            </p>
          ) : null}
          <Button icon={PenLine} onClick={() => { setName(customerName); setOpen(true); }} disabled={missing > 0}>Pedir firma del cliente</Button>
          <p className="text-[11px] text-gray-400">Pasa el teléfono o la tableta al cliente para que firme con el dedo. Al firmar, la recepción queda bloqueada.</p>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <p className="text-sm font-semibold text-gray-800">Firma del asesor que recibe <span className="font-normal text-gray-400">(administrador o supervisor)</span></p>
        {advisorSigned ? (
          <div className="rounded-md border border-emerald-200 border-l-[3px] border-l-emerald-500 bg-emerald-50/50 p-4 space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck size={16} /> Recibido por el asesor</p>
            {order.advisorSignature && (
              <div className="rounded-md border border-gray-200 bg-white p-2 inline-block">
                <img src={order.advisorSignature} alt="Firma del asesor" className="h-20 w-auto max-w-full" />
              </div>
            )}
            <p className="text-xs text-gray-600"><b>{order.advisorName}</b> · {fDateTime(order.advisorSignedAt)}</p>
          </div>
        ) : (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-2">
            <p className="text-xs text-gray-600">Firma quien recibe el vehículo: <b>{`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</b>. Su nombre y firma salen en la orden de recepción.</p>
            <Button icon={PenLine} variant="secondary" onClick={() => setAdvOpen(true)}>Firmar como asesor</Button>
          </div>
        )}
      </div>

      {advOpen && (
        <SignaturePad
          title="Firma del asesor"
          subtitle="Firma con el dedo dentro del recuadro."
          onClose={() => setAdvOpen(false)}
          onSave={(dataUrl) => advMut.mutate(dataUrl)}
          loading={advMut.isPending}
        />
      )}

      {open && (
        <SignaturePad
          title="Conformidad de recepción"
          subtitle="El cliente firma con el dedo dentro del recuadro."
          extra={(
            <div className="mb-3 space-y-2">
              <p className="text-xs text-gray-600 italic">“{RECEPTION_STATEMENT}”</p>
              <Input label="Nombre de quien firma *" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          onClose={() => setOpen(false)}
          onSave={(dataUrl) => { if (name.trim().length < 2) return toast.error('Escribe el nombre de quien firma'); signMut.mutate(dataUrl); }}
          loading={signMut.isPending}
        />
      )}

      <ConfirmDialog
        open={annul}
        onClose={() => setAnnul(false)}
        onConfirm={() => clearMut.mutate()}
        loading={clearMut.isPending}
        title="Anular firma de recepción"
        message="Se borrarán la firma del cliente y la del asesor, y se desbloquearán los datos y fotos de recepción. Después habrá que volver a pedir la firma."
      />
    </div>
  );
}

