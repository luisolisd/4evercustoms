import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { getCustomers } from '../../services/customers';
import { getVehicles } from '../../services/vehicles';
import { useAuthStore } from '../../store/authStore';
import { useWatch } from 'react-hook-form';

const SERVICES = [
  'Cambio de aceite', 'Afinación', 'Frenos', 'Suspensión',
  'Transmisión', 'Motor', 'Eléctrico', 'A/C', 'Diagnóstico', 'Revisión general', 'Otro',
];

export default function AppointmentForm({ defaultValues, onSubmit, loading }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const { register, handleSubmit, control, formState: { errors } } = useForm({ defaultValues });
  const customerId = useWatch({ control, name: 'customerId' });

  const { data: customers } = useQuery({
    queryKey: ['customers-all', workshopId],
    queryFn: () => getCustomers(workshopId, { limit: 100 }).then((r) => r.data),
    enabled: !!workshopId,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-customer', customerId],
    queryFn: () => getVehicles(workshopId, { customerId, limit: 50 }).then((r) => r.data),
    enabled: !!customerId,
  });

  const customerOpts = (customers || []).map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName} — ${c.phone}`,
  }));

  const vehicleOpts = (vehicles || []).map((v) => ({
    value: v.id,
    label: `${v.year} ${v.make} ${v.model}${v.licensePlate ? ` (${v.licensePlate})` : ''}`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Cliente *"
        placeholder="Seleccionar cliente"
        options={customerOpts}
        error={errors.customerId?.message}
        {...register('customerId', { required: 'Requerido' })}
      />
      <Select
        label="Vehículo *"
        placeholder={customerId ? 'Seleccionar vehículo' : 'Primero elige un cliente'}
        options={vehicleOpts}
        disabled={!customerId}
        error={errors.vehicleId?.message}
        {...register('vehicleId', { required: 'Requerido' })}
      />
      <Select
        label="Tipo de servicio *"
        placeholder="Seleccionar"
        options={SERVICES.map((s) => ({ value: s, label: s }))}
        error={errors.serviceType?.message}
        {...register('serviceType', { required: 'Requerido' })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Fecha y hora *"
          type="datetime-local"
          error={errors.scheduledAt?.message}
          {...register('scheduledAt', { required: 'Requerido' })}
        />
        <Input
          label="Duración (min)"
          type="number"
          defaultValue={60}
          {...register('duration', { valueAsNumber: true })}
        />
      </div>
      <Textarea label="Notas" placeholder="Instrucciones especiales..." rows={2} {...register('notes')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues?.id ? 'Guardar cambios' : 'Crear cita'}
        </Button>
      </div>
    </form>
  );
}
