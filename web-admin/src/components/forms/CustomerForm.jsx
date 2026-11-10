import { useForm } from 'react-hook-form';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';

export default function CustomerForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nombre *"
          placeholder="Juan"
          error={errors.firstName?.message}
          {...register('firstName', { required: 'Requerido' })}
        />
        <Input
          label="Apellido *"
          placeholder="Pérez"
          error={errors.lastName?.message}
          {...register('lastName', { required: 'Requerido' })}
        />
      </div>
      <Input
        label="Teléfono *"
        placeholder="10 dígitos, ej. 4721234567"
        type="tel"
        inputMode="numeric"
        maxLength={10}
        error={errors.phone?.message}
        {...register('phone', {
          required: 'Requerido',
          setValueAs: (v) => String(v ?? '').replace(/\D/g, '').slice(0, 10),
          pattern: { value: /^\d{10}$/, message: 'Escribe los 10 dígitos, sin +52' },
        })}
      />
      <Input
        label="Email"
        type="email"
        placeholder="juan@email.com"
        error={errors.email?.message}
        {...register('email', {
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
        })}
      />
      <Input
        label="RFC (opcional)"
        placeholder="Para facturar, ej. XAXX010101000"
        maxLength={13}
        autoCapitalize="characters"
        error={errors.rfc?.message}
        {...register('rfc', {
          setValueAs: (v) => String(v ?? '').replace(/\s/g, '').toUpperCase(),
          pattern: { value: /^([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})?$/, message: 'RFC inválido (12 o 13 caracteres)' },
        })}
      />
      <Input label="Dirección" placeholder="Av. Principal 123" {...register('address')} />
      <Textarea label="Notas" placeholder="Información adicional..." rows={2} {...register('notes')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" className="w-full sm:w-auto" loading={loading}>
          {defaultValues?.id ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  );
}
