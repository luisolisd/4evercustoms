import { useForm } from 'react-hook-form';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';

export default function PartForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nombre *"
        placeholder="Filtro de aceite"
        error={errors.name?.message}
        {...register('name', { required: 'Requerido' })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="SKU / Código" placeholder="FILT-001" {...register('sku')} />
        <Input label="Marca" placeholder="Bosch" {...register('brand')} />
      </div>
      <Input
        label="Precio unitario (sin IVA) *"
        type="number"
        step="0.01"
        placeholder="0.00"
        error={errors.unitPrice?.message}
        {...register('unitPrice', { required: 'Requerido', valueAsNumber: true, min: 0 })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Cantidad inicial"
          type="number"
          defaultValue={0}
          {...register('initialQuantity', { valueAsNumber: true, min: 0 })}
        />
        <Input
          label="Stock mínimo"
          type="number"
          defaultValue={0}
          {...register('minQuantity', { valueAsNumber: true, min: 0 })}
        />
      </div>
      <Input label="Ubicación en almacén" placeholder="Estante A, Cajón 3" {...register('location')} />
      <Textarea label="Descripción" placeholder="Detalles adicionales..." rows={2} {...register('description')} />
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues?.id ? 'Guardar cambios' : 'Agregar refacción'}
        </Button>
      </div>
    </form>
  );
}
