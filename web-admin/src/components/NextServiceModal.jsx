import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import { createReminder } from '../services/reminders';
import { SERVICES } from '../constants/services';
import { useToast } from '../hooks/useToast';

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * "Próximo servicio": se ofrece al entregar el vehículo. Crea un recordatorio para supervisor/admin
 * (con enlace de WhatsApp listo) con el kilometraje estimado y la fecha del siguiente servicio.
 */
export default function NextServiceModal({ open, onClose, order, workshopId }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [service, setService] = useState(SERVICES[0]);
  const [other, setOther] = useState('');
  const [km, setKm] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  // Sugerencia: +6 meses y +5,000 km sobre el kilometraje de salida/entrada del vehículo
  useEffect(() => {
    if (!open || !order) return;
    const base = Number(order.mileageOut || order.mileageIn || order.vehicle?.mileage || 0);
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setService(SERVICES[0]); setOther(''); setNotes('');
    setKm(base ? String(base + 5000) : '');
    setDate(isoDate(d));
  }, [open, order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: () => createReminder(workshopId, {
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      workOrderId: order.id,
      serviceType: service === 'Otro' ? other.trim() : service,
      dueDate: new Date(`${date}T12:00:00`).toISOString(),
      nextMileage: km ? Number(km) : undefined,
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders', workshopId] });
      qc.invalidateQueries({ queryKey: ['dashboard', workshopId] });
      toast.success('Recordatorio creado. Lo verás en Recordatorios y en el dashboard.');
      onClose();
    },
    onError: (e) => toast.error(e.message || 'No se pudo crear el recordatorio'),
  });

  const valid = date && (service !== 'Otro' || other.trim());

  return (
    <Modal open={open} onClose={onClose} title="Próximo servicio" size="md">
      <form onSubmit={(e) => { e.preventDefault(); if (valid) createMut.mutate(); }} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
          <BellRing size={18} className="mt-0.5 shrink-0" />
          <p>
            Vehículo entregado{order?.vehicle ? `: ${order.vehicle.year} ${order.vehicle.make} ${order.vehicle.model}` : ''}. Programa el recordatorio del siguiente servicio;
            quedará en el panel de supervisor y admin para avisar al cliente por WhatsApp con un clic.
          </p>
        </div>

        <Select label="Servicio a recordar *" options={SERVICES.map((s) => ({ value: s, label: s }))} value={service} onChange={(e) => setService(e.target.value)} />
        {service === 'Otro' && <Input label="Especifica el servicio *" value={other} onChange={(e) => setOther(e.target.value)} maxLength={100} />}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Kilometraje estimado" type="number" min="0" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ej. 15000" />
          <Input label="Fecha del recordatorio *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Textarea label="Notas" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. cambio de aceite sintético y filtros" />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Omitir</Button>
          <Button type="submit" loading={createMut.isPending} disabled={!valid}>Crear recordatorio</Button>
        </div>
      </form>
    </Modal>
  );
}
