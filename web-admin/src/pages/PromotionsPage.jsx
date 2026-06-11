import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Trash2, Eye, EyeOff, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getPromotions, createPromotion, togglePromotion, deletePromotion } from '../services/promotions';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import { fDate } from '../utils/formatters';

export default function PromotionsPage() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', imageUrl: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['promotions', workshopId],
    queryFn: () => getPromotions(workshopId),
    enabled: !!workshopId,
  });
  const promos = data?.data || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['promotions', workshopId] });

  const createMut = useMutation({
    mutationFn: (d) => createPromotion(workshopId, d),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ title: '', body: '', imageUrl: '' });
      toast.success('Promoción publicada y notificada a tus clientes');
    },
    onError: (e) => toast.error(e.message || 'Error al crear la promoción'),
  });
  const toggleMut = useMutation({ mutationFn: (id) => togglePromotion(workshopId, id), onSuccess: invalidate });
  const deleteMut = useMutation({
    mutationFn: (id) => deletePromotion(workshopId, id),
    onSuccess: () => { invalidate(); toast.success('Promoción eliminada'); },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    createMut.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-gray-500 text-sm">Al publicar, se envía una notificación a todos tus clientes.</p>
        </div>
        <Button icon={Plus} onClick={() => setOpen(true)}>Nueva promoción</Button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Cargando…</p>}

      {!isLoading && promos.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Aún no hay promociones</p>
          <p className="text-sm">Crea la primera y tus clientes recibirán una notificación.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {promos.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-36 object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{p.body}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {p.isActive ? 'Activa' : 'Oculta'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs text-gray-400">{fDate ? fDate(p.createdAt) : new Date(p.createdAt).toLocaleDateString('es-MX')}</span>
                <div className="flex gap-1">
                  <button onClick={() => toggleMut.mutate(p.id)} title={p.isActive ? 'Ocultar' : 'Mostrar'}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                    {p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => deleteMut.mutate(p.id)} title="Eliminar"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva promoción">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej. 20% en cambio de aceite" maxLength={80}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Detalles de la promoción, vigencia, condiciones…" rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (URL opcional)</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" icon={Send} loading={createMut.isPending}>Publicar y notificar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
