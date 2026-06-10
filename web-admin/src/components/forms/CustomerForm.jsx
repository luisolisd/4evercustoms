import { useForm } from 'react-hook-form';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';

export default function CustomerForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
        placeholder="+526641234567"
        error={errors.phone?.message}
        {...register('phone', {
          required: 'Requerido',
          pattern: { value: /^\+\d{10,15}$/, message: 'Formato: +526641234567' },
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
      <Input label="Dirección" placeholder="Av. Principal 123" {...register('address')} />
      <Textarea label="Notas" placeholder="Información adicional..." rows={2} {...register('notes')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {defaultValues?.id ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  );
}
