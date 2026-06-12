import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { getParts } from '../../services/inventory';
import { useAuthStore } from '../../store/authStore';

export default function QuoteItemForm({ onSubmit, loading }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { isLabor: false, quantity: 1, unitPrice: 0 },
  });

  // Mismo formato que el resto (devuelve el body) para no chocar con la key compartida 'parts-all'
  const { data: partsRes } = useQuery({
    queryKey: ['parts-all', workshopId],
    queryFn: () => getParts(workshopId, { limit: 200 }),
    enabled: !!workshopId,
  });
  const parts = partsRes?.data || [];

  const partOptions = (parts || []).map((p) => ({
    value: p.id,
    label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — $${Number(p.unitPrice).toFixed(2)}`,
  }));

  const partId = watch('partId');
  const handlePartChange = (e) => {
    const part = parts?.find((p) => p.id === e.target.value);
    if (part) setValue('unitPrice', Number(part.unitPrice));
    setValue('description', part?.name || '');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input type="checkbox" id="isLabor" {...register('isLabor')} className="rounded" />
        <label htmlFor="isLabor" className="text-sm font-medium text-gray-700">Es mano de obra</label>
      </div>
      <Select
        label="Refacción del inventario"
        placeholder="Seleccionar (opcional)"
        options={partOptions}
        {...register('partId')}
        onChange={(e) => { register('partId').onChange(e); handlePartChange(e); }}
      />
      <Input
        label="Descripción *"
        placeholder="Nombre del servicio o pieza"
        error={errors.description?.message}
        {...register('description', { required: 'Requerido' })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Cantidad *"
          type="number"
          step="0.01"
          error={errors.quantity?.message}
          {...register('quantity', { required: true, valueAsNumber: true, min: 0.01 })}
        />
        <Input
          label="Precio unit. (IVA incl.) *"
          type="number"
          step="0.01"
          error={errors.unitPrice?.message}
          {...register('unitPrice', { required: true, valueAsNumber: true, min: 0 })}
        />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>Agregar línea</Button>
      </div>
    </form>
  );
}
