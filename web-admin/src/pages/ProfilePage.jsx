import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { User, Lock, Store } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { updateProfile, changePassword } from '../services/profile';
import { getWorkshop, updateWorkshop } from '../services/workshop';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import clsx from 'clsx';

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'workshop', label: 'Taller', icon: Store },
  { id: 'security', label: 'Seguridad', icon: Lock },
];

function WorkshopTab({ workshopId }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => getWorkshop(workshopId),
    enabled: !!workshopId,
  });
  const w = data?.data;

  const { register, handleSubmit, formState: { errors } } = useForm({
    values: w ? {
      name: w.name || '', legalName: w.legalName || '', taxId: w.taxId || '',
      phone: w.phone || '', email: w.email || '',
      address: w.address || '', city: w.city || '', state: w.state || '',
    } : undefined,
  });

  const mut = useMutation({
    mutationFn: (d) => updateWorkshop(workshopId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workshop', workshopId] }); toast.success('Datos del taller actualizados'); },
    onError: (e) => toast.error(e.message || 'Error al guardar'),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Cargando…</p>;

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5 max-w-md">
      <Input label="Nombre del taller" {...register('name', { required: 'Requerido' })} error={errors.name?.message} />
      <Input label="Razón social (aparece en el PDF)" placeholder="PEDRO RAMIRO SOLIS DURAN" {...register('legalName')} />
      <Input label="RFC" placeholder="SODP871115H1A" {...register('taxId')} />
      <Input label="Teléfono" {...register('phone', { required: 'Requerido' })} error={errors.phone?.message} />
      <Input label="Correo" type="email" {...register('email')} />
      <Input label="Dirección" {...register('address')} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Ciudad" {...register('city')} />
        <Input label="Estado" {...register('state')} />
      </div>
      <div className="pt-2">
        <Button type="submit" loading={mut.isPending}>Guardar cambios</Button>
      </div>
    </form>
  );
}

function ProfileTab({ user, workshopId }) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const toast = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: (user?.phone || '').replace(/\D/g, '').slice(-10),
    },
  });

  const mut = useMutation({
    mutationFn: (d) => updateProfile(workshopId, d),
    onSuccess: (res) => { updateUser(res.data); toast.success('Perfil actualizado'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5 max-w-md">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-gray-500">{user?.phone}</p>
        </div>
      </div>
      <Input label="Nombre" {...register('firstName', { required: 'Requerido' })} error={errors.firstName?.message} />
      <Input label="Apellido" {...register('lastName')} error={errors.lastName?.message} />
      <Input label="Teléfono (10 dígitos)" placeholder="4721082970" maxLength={10}
        {...register('phone', { pattern: { value: /^\d{10}$/, message: '10 dígitos' } })}
        error={errors.phone?.message} />
      <div className="pt-2">
        <Button type="submit" loading={mut.isPending}>Guardar cambios</Button>
      </div>
    </form>
  );
}

function SecurityTab({ workshopId }) {
  const toast = useToast();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  const mut = useMutation({
    mutationFn: (d) => changePassword(workshopId, d),
    onSuccess: () => { toast.success('Contraseña actualizada'); reset(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5 max-w-md">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        Para cambiar tu contraseña debes ingresar la contraseña actual y la nueva.
      </div>
      <Input
        label="Contraseña actual"
        type="password"
        placeholder="••••••••"
        {...register('currentPassword', { required: 'Requerido' })}
        error={errors.currentPassword?.message}
      />
      <Input
        label="Nueva contraseña"
        type="password"
        placeholder="••••••••"
        {...register('newPassword', { required: 'Requerido', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
        error={errors.newPassword?.message}
      />
      <Input
        label="Confirmar nueva contraseña"
        type="password"
        placeholder="••••••••"
        {...register('confirmPassword', {
          required: 'Requerido',
          validate: (v) => v === newPassword || 'Las contraseñas no coinciden',
        })}
        error={errors.confirmPassword?.message}
      />
      <div className="pt-2">
        <Button type="submit" loading={mut.isPending}>Actualizar contraseña</Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const workshopId = useAuthStore((s) => s.workshopId);
  const [tab, setTab] = useState('profile');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Configura tu cuenta y preferencias</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors',
                tab === t.id ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'profile' && <ProfileTab user={user} workshopId={workshopId} />}
          {tab === 'workshop' && <WorkshopTab workshopId={workshopId} />}
          {tab === 'security' && <SecurityTab workshopId={workshopId} />}
        </div>
      </div>
    </div>
  );
}
