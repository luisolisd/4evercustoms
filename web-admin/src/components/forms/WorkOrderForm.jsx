import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { getCustomers } from '../../services/customers';
import { getVehicles } from '../../services/vehicles';
import { useAuthStore } from '../../store/authStore';
import { fromLocalInput } from '../../utils/formatters';

export default function WorkOrderForm({ defaultValues, onSubmit, loading }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const { register, handleSubmit, control, formState: { errors } } = useForm({ defaultValues });
  const customerId = useWatch({ control, name: 'customerId' });

  const { data: customers } = useQuery({
    queryKey: ['customers-all', workshopId],
    queryFn: () => getCustomers(workshopId, { limit: 500 }).then((r) => r.data),
    enabled: !!workshopId,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-customer', customerId],
    queryFn: () => getVehicles(workshopId, { customerId, limit: 50 }).then((r) => r.data),
    enabled: !!customerId,
  });

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...d, estimatedReady: fromLocalInput(d.estimatedReady) }))} className="space-y-4">
      <Select
        label="Cliente *"
        placeholder="Seleccionar cliente"
        options={(customers || []).map((c) => ({
          value: c.id,
          label: `${c.firstName} ${c.lastName} — ${c.phone}`,
        }))}
        error={errors.customerId?.message}
        {...register('customerId', { required: 'Requerido' })}
      />
      <Select
        label="Vehículo *"
        placeholder={customerId ? 'Seleccionar vehículo' : 'Elige un cliente primero'}
        options={(vehicles || []).map((v) => ({
          value: v.id,
          label: `${v.year} ${v.make} ${v.model}${v.licensePlate ? ` — ${v.licensePlate}` : ''}`,
        }))}
        disabled={!customerId}
        error={errors.vehicleId?.message}
        {...register('vehicleId', { required: 'Requerido' })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Kilometraje entrada"
          type="number"
          placeholder="45000"
          {...register('mileageIn', { valueAsNumber: true })}
        />
        <Input
          label="Entrega estimada"
          type="datetime-local"
          {...register('estimatedReady')}
        />
      </div>
      <Textarea
        label="Descripción del problema *"
        placeholder="Describe el problema reportado por el cliente..."
        rows={3}
        error={errors.description?.message}
        {...register('description', { required: 'Requerido' })}
      />
      <Textarea
        label="Diagnóstico inicial"
        placeholder="Diagnóstico técnico..."
        rows={2}
        {...register('diagnosis')}
      />
      <p className="text-xs text-gray-500 rounded-lg bg-gray-50 p-3">Al crear la orden podrás tomar las fotos de recepción del vehículo. Después asignas técnico(s) y eliges las fotos que se les pedirán.</p>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>Crear orden y tomar fotos</Button>
      </div>
    </form>
  );
}


