import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Select from './ui/Select';
import { getVehicles } from '../services/vehicles';
import { createOrderFromQuote } from '../services/quotes';
import { useToast } from '../hooks/useToast';

/**
 * Crea la orden de trabajo desde una cotización APROBADA (el servidor rechaza las no aprobadas).
 * Hereda al cliente y el total; solo falta elegir el vehículo.
 */
export default function CreateOrderFromQuoteModal({ open, onClose, quote, workshopId }) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [vehicleId, setVehicleId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles-customer', quote?.customer?.id],
    queryFn: () => getVehicles(workshopId, { customerId: quote.customer.id, limit: 50 }).then((r) => r.data),
    enabled: open && !!quote?.customer?.id,
  });
  const vehicles = data || [];

  // Si el cliente solo tiene un vehículo, se preselecciona
  useEffect(() => {
    if (open) setVehicleId(vehicles.length === 1 ? vehicles[0].id : '');
  }, [open, vehicles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const mut = useMutation({
    mutationFn: () => createOrderFromQuote(workshopId, quote.id, vehicleId),
    onSuccess: (res) => {
      ['quotes', 'work-orders', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success('Orden creada desde la cotización');
      onClose();
      navigate(`/work-orders/${res.data.id}?tab=recepcion`);
    },
    onError: (e) => toast.error(e.message || 'No se pudo crear la orden'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Crear orden desde cotización" size="sm">
      <form onSubmit={(e) => { e.preventDefault(); if (vehicleId) mut.mutate(); }} className="space-y-4">
        <p className="text-sm text-gray-600">
          Cotización <b>{quote?.quoteNumber}</b> aprobada de <b>{quote?.customer?.firstName} {quote?.customer?.lastName}</b>.
          La orden se crea con ese total; después toma las fotos de recepción y asigna técnico.
        </p>
        <Select
          label="Vehículo *"
          placeholder={isLoading ? 'Cargando…' : vehicles.length ? 'Seleccionar vehículo' : 'El cliente no tiene vehículos'}
          options={vehicles.map((v) => ({ value: v.id, label: `${v.year} ${v.make} ${v.model}${v.licensePlate ? ` (${v.licensePlate})` : ''}` }))}
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        />
        {!isLoading && vehicles.length === 0 && (
          <p className="text-xs text-amber-700 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">Registra primero el vehículo del cliente en Vehículos.</p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mut.isPending} disabled={!vehicleId}>Crear orden</Button>
        </div>
      </form>
    </Modal>
  );
}
