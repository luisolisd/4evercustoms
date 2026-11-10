import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Edit2, KeyRound, UserX, UserCheck } from 'lucide-react';
import { useAuthStore, ROLE_LABELS } from '../store/authStore';
import { getUsers, createUser, updateUser, resetUserPassword } from '../services/team';
import Button from '../components/ui/Button';
import ResponsiveTable, { RowAction } from '../components/ui/ResponsiveTable';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { fDateTime } from '../utils/formatters';

const ROLE_OPTS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const ROLE_COLOR = { WORKSHOP_ADMIN: 'brand', SUPERVISOR: 'blue', TECHNICIAN: 'teal' };

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', role: 'TECHNICIAN', password: '' };

export default function UsersPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const toast = useToast();

  const [modal, setModal] = useState(null); // { mode: 'create' } | { mode: 'edit', row } | { mode: 'password', row }
  const [form, setForm] = useState(EMPTY);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ['team', workshopId],
    queryFn: () => getUsers(workshopId).then((r) => r.data),
    enabled: !!workshopId,
  });
  const rows = data || [];

  const done = (msg) => {
    qc.invalidateQueries({ queryKey: ['team', workshopId] });
    qc.invalidateQueries({ queryKey: ['technicians', workshopId] });
    setModal(null);
    toast.success(msg);
  };
  const fail = (e) => toast.error(e.message || 'Ocurrió un error');

  const createMut = useMutation({ mutationFn: () => createUser(workshopId, form), onSuccess: () => done('Usuario creado'), onError: fail });
  const editMut = useMutation({
    mutationFn: () => updateUser(workshopId, modal.row.userId, {
      firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, role: form.role,
    }),
    onSuccess: () => done('Usuario actualizado'),
    onError: fail,
  });
  const pwMut = useMutation({
    mutationFn: () => resetUserPassword(workshopId, modal.row.userId, form.password),
    onSuccess: () => done('Contraseña actualizada'),
    onError: fail,
  });
  const activeMut = useMutation({
    mutationFn: ({ userId, isActive }) => updateUser(workshopId, userId, { isActive }),
    onSuccess: () => done('Estado actualizado'),
    onError: fail,
  });

  const openCreate = () => { setForm({ ...EMPTY, password: randomPassword() }); setModal({ mode: 'create' }); };
  const openEdit = (row) => {
    setForm({
      firstName: row.user.firstName, lastName: row.user.lastName, email: row.user.email || '',
      phone: (row.user.phone || '').replace(/\D/g, '').slice(-10), role: row.role, password: '',
    });
    setModal({ mode: 'edit', row });
  };
  const openPassword = (row) => { setForm({ ...EMPTY, password: randomPassword() }); setModal({ mode: 'password', row }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Equipo</p>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Administradores, supervisores y técnicos del taller</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Nuevo usuario</Button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="Sin usuarios" description="Crea el primer usuario del equipo." />
        ) : (
          <ResponsiveTable
  rows={rows}
  rowKey="id"
  rowClassName={(r) => (r.isActive ? '' : 'opacity-50')}
  columns={[
    { key: 'name', header: 'Nombre', mobile: 'title', cell: (r) => (
      <p className="font-semibold md:font-medium text-gray-900">{r.user.firstName} {r.user.lastName}{r.userId === me?.id && <span className="ml-2 text-xs font-normal text-gray-400">(tú)</span>}</p>
    ) },
    { key: 'role', header: 'Rol', mobile: 'badge', cell: (r) => <Badge color={ROLE_COLOR[r.role] || 'gray'}>{ROLE_LABELS[r.role] || r.role}</Badge> },
    { key: 'access', header: 'Acceso', cell: (r) => <div className="text-gray-600"><p>{r.user.email || '—'}</p><p className="text-xs text-gray-400">{r.user.phone}</p></div> },
    { key: 'last', header: 'Último acceso', cell: (r) => <span className="text-gray-500">{r.user.lastLoginAt ? fDateTime(r.user.lastLoginAt) : 'Nunca'}</span> },
  ]}
  actions={(r, { mobile }) => (
    <>
      <RowAction mobile={mobile} icon={Edit2} label="Editar" tone="blue" onClick={() => openEdit(r)} />
      <RowAction mobile={mobile} icon={KeyRound} label="Contraseña" tone="amber" onClick={() => openPassword(r)} />
      {r.userId !== me?.id && (
        <RowAction mobile={mobile} icon={r.isActive ? UserX : UserCheck} label={r.isActive ? 'Desactivar' : 'Activar'} tone="red" onClick={() => activeMut.mutate({ userId: r.userId, isActive: !r.isActive })} />
      )}
    </>
  )}
/>
        )}
      </div>

      <Modal open={modal?.mode === 'create' || modal?.mode === 'edit'} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Editar usuario' : 'Nuevo usuario'} size="md">
        <form
          onSubmit={(e) => { e.preventDefault(); (modal.mode === 'edit' ? editMut : createMut).mutate(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre *" value={form.firstName} onChange={set('firstName')} required />
            <Input label="Apellido" value={form.lastName} onChange={set('lastName')} />
          </div>
          <Input label="Correo (para iniciar sesión) *" type="email" value={form.email} onChange={set('email')} required />
          <Input label="Teléfono (10 dígitos, sin +52) *" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} required />
          <Select label="Rol *" options={ROLE_OPTS} value={form.role} onChange={set('role')} />
          {modal?.mode === 'create' && (
            <div>
              <Input label="Contraseña temporal *" value={form.password} onChange={set('password')} required minLength={8} />
              <p className="text-xs text-gray-500 mt-1">Compártela con la persona; puede cambiarla desde su perfil.</p>
            </div>
          )}
          <p className="text-xs text-gray-500 rounded-lg bg-gray-50 p-3">
            <b>Administrador:</b> todo. <b>Supervisor:</b> clientes, órdenes, cotizaciones, cobros, fotos y recordatorios. <b>Técnico:</b> solo sus órdenes asignadas (estatus, notas y fotos).
          </p>
          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" loading={createMut.isPending || editMut.isPending}>{modal?.mode === 'edit' ? 'Guardar' : 'Crear usuario'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal?.mode === 'password'} onClose={() => setModal(null)} title="Cambiar contraseña" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); pwMut.mutate(); }} className="space-y-4">
          <p className="text-sm text-gray-600">{modal?.row?.user?.firstName} {modal?.row?.user?.lastName}</p>
          <Input label="Nueva contraseña *" value={form.password} onChange={set('password')} required minLength={8} />
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setForm((f) => ({ ...f, password: randomPassword() }))}>Generar</Button>
            <Button type="submit" className="w-full sm:w-auto" loading={pwMut.isPending}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
