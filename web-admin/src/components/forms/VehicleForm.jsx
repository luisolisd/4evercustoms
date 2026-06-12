import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { getCustomers } from '../../services/customers';
import { useAuthStore } from '../../store/authStore';
import { CAR_BRANDS } from '../../constants/brands';
import BrandLogo from '../ui/BrandLogo';

const COLORS = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Café', 'Otro'];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 40 }, (_, i) => ({ value: currentYear - i, label: currentYear - i }));
const BRAND_OPTIONS = [
  ...CAR_BRANDS.map((b) => ({ value: b, label: b })),
  { value: '__otra__', label: 'Otra marca…' },
];

export default function VehicleForm({ defaultValues, onSubmit, loading, fixedCustomerId }) {
  const workshopId = useAuthStore((s) => s.workshopId);

  const known = defaultValues?.make && CAR_BRANDS.includes(defaultValues.make);
  const initialValues = defaultValues
    ? {
        ...defaultValues,
        make: defaultValues.make ? (known ? defaultValues.make : '__otra__') : '',
        makeOther: known ? '' : (defaultValues.make || ''),
      }
    : { year: currentYear };

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: initialValues,
  });
  const makeVal = watch('make');

  const submit = (d) => {
    const make = d.make === '__otra__' ? (d.makeOther || '').trim() : d.make;
    const { makeOther, ...rest } = d;
    onSubmit({ ...rest, make });
  };

  const { data: customers } = useQuery({
    queryKey: ['customers-all', workshopId],
    queryFn: () => getCustomers(workshopId, { limit: 100 }).then((r) => r.data),
    enabled: !!workshopId && !fixedCustomerId,
  });

  const customerOptions = (customers || []).map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName} — ${c.phone}`,
  }));

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {!fixedCustomerId && (
        <Select
          label="Cliente *"
          placeholder="Seleccionar cliente"
          options={customerOptions}
          error={errors.customerId?.message}
          {...register('customerId', { required: 'Requerido' })}
        />
      )}
      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Marca *"
          placeholder="Seleccionar"
          options={BRAND_OPTIONS}
          error={errors.make?.message}
          {...register('make', { required: 'Requerido' })}
        />
        <Input
          label="Modelo *"
          placeholder="Corolla"
          error={errors.model?.message}
          {...register('model', { required: 'Requerido' })}
        />
        <Select
          label="Año *"
          options={years}
          error={errors.year?.message}
          {...register('year', { required: 'Requerido', valueAsNumber: true })}
        />
      </div>
      {makeVal === '__otra__' && (
        <Input
          label="Especifica la marca *"
          placeholder="Marca del vehículo"
          error={errors.makeOther?.message}
          {...register('makeOther', { validate: (v) => makeVal !== '__otra__' || (v && v.trim()) ? true : 'Requerido' })}
        />
      )}
      {makeVal && makeVal !== '__otra__' && (
        <div className="flex items-center gap-2 -mt-2 text-xs text-gray-500">
          <BrandLogo make={makeVal} size={20} /> Emblema de {makeVal}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Placa" placeholder="ABC-123" {...register('licensePlate')} />
        <Select
          label="Color"
          placeholder="Seleccionar"
          options={COLORS.map((c) => ({ value: c, label: c }))}
          {...register('color')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="VIN / No. Serie" placeholder="1HGBH41JXMN109186" {...register('vin')} />
        <Input
          label="Kilometraje"
          type="number"
          placeholder="0"
          {...register('mileage', { valueAsNumber: true })}
        />
      </div>
      <Input label="Tipo de motor" placeholder="2.0L 4-cilindros" {...register('engineType')} />
      <Textarea label="Notas" placeholder="Condiciones especiales, accesorios..." rows={2} {...register('notes')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues?.id ? 'Guardar cambios' : 'Registrar vehículo'}
        </Button>
      </div>
    </form>
  );
}
