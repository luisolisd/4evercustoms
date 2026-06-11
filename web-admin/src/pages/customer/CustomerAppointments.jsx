import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, X } from 'lucide-react';
import { getAppointments, getVehicles, createAppointment, cancelAppointment } from '../../services/customer';
import { APPT_STATUS, fmtDateTime } from './status';

export default function CustomerAppointments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: appts, isLoading } = useQuery({ queryKey: ['c-appts'], queryFn: getAppointments });
  const { data: vehicles } = useQuery({ queryKey: ['c-vehicles'], queryFn: getVehicles });

  const create = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['c-appts'] }); setOpen(false); },
  });
  const cancel = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-appts'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mis citas</h1>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-brand-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-700">
          <CalendarPlus size={16} /> Agendar
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}
      {!isLoading && (!appts || appts.length === 0) && (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm shadow-sm">
          No tienes citas. Toca “Agendar” para solicitar una.
        </div>
      )}

      <div className="space-y-2">
        {appts?.map((a) => {
          const st = APPT_STATUS[a.status];
          const canCancel = ['PENDING', 'CONFIRMED'].includes(a.status);
          return (
            <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm">{a.serviceType}</p>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st?.color || ''}`}>{st?.label || a.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{fmtDateTime(a.scheduledAt)}</p>
              {a.vehicle && <p className="text-xs text-gray-400 mt-0.5">{a.vehicle.make} {a.vehicle.model} {a.vehicle.year}</p>}
              {canCancel && (
                <button onClick={() => cancel.mutate(a.id)} disabled={cancel.isPending}
                  className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                  <X size={13} /> Cancelar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <BookModal
          vehicles={vehicles || []}
          onClose={() => setOpen(false)}
          onSubmit={(payload) => create.mutate(payload)}
          loading={create.isPending}
          error={create.isError ? (create.error?.message || 'No se pudo agendar') : ''}
        />
      )}
    </div>
  );
}

function BookModal({ vehicles, onClose, onSubmit, loading, error }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [date, setDate] = useState('');
  const [serviceType, setServiceType] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!vehicleId || !date || !serviceType) return;
    onSubmit({ vehicleId, scheduledAt: new Date(date).toISOString(), serviceType });
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Agendar cita</h2>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {vehicles.length === 0 && <option value="">Sin vehículos</option>}
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <input type="text" value={serviceType} onChange={(e) => setServiceType(e.target.value)}
              placeholder="Ej. Cambio de aceite, afinación…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700">Cancelar</button>
            <button type="submit" disabled={loading || vehicles.length === 0}
              className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Enviando…' : 'Solicitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
