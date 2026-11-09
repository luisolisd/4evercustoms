import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Images, Trash2, Eye, Plus, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import {
  getGallery, bulkDeletePhotos, getPhotoTemplates, createPhotoTemplate, updatePhotoTemplate, deletePhotoTemplate,
} from '../services/photos';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import { fDateTime } from '../utils/formatters';
import { formatBytes } from '../utils/image';

const startOfDayIso = (v) => (v ? new Date(`${v}T00:00:00`).toISOString() : undefined);
const endOfDayIso = (v) => (v ? new Date(`${v}T23:59:59.999`).toISOString() : undefined);

function Gallery() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null); // ids[] a eliminar

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', workshopId, search, from, to, page],
    queryFn: () => getGallery(workshopId, {
      search: search || undefined, from: startOfDayIso(from), to: endOfDayIso(to), page, limit: 30,
    }),
    enabled: !!workshopId,
    keepPreviousData: true,
  });
  const photos = data?.data || [];
  const pagination = data?.pagination;

  const delMut = useMutation({
    mutationFn: (ids) => bulkDeletePhotos(workshopId, ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['gallery', workshopId] });
      qc.invalidateQueries({ queryKey: ['work-order'] });
      setSelected(new Set());
      setConfirm(null);
      toast.success(`${res.data.deleted} foto(s) eliminada(s)`);
    },
    onError: (e) => toast.error(e.message || 'No se pudo eliminar'),
  });

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = photos.length > 0 && photos.every((p) => selected.has(p.id));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allOnPage) photos.forEach((p) => n.delete(p.id)); else photos.forEach((p) => n.add(p.id));
    return n;
  });

  const reset = (fn) => (v) => { fn(v); setPage(1); setSelected(new Set()); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <SearchInput value={search} onChange={reset(setSearch)} placeholder="Buscar por orden o cliente…" className="flex-1 min-w-[200px] max-w-sm" />
        <div className="w-40"><Input label="Desde" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} /></div>
        <div className="w-40"><Input label="Hasta" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} /></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-gray-500">
          {pagination?.total ?? 0} foto(s) · ocupan <b className="text-gray-800">{formatBytes(data?.totalBytes)}</b> con estos filtros
        </p>
        <div className="flex items-center gap-2">
          <button onClick={toggleAll} className="text-xs underline text-gray-500" disabled={!photos.length}>
            {allOnPage ? 'Quitar selección' : 'Seleccionar página'}
          </button>
          <Button size="sm" variant="danger" icon={Trash2} disabled={!selected.size} onClick={() => setConfirm([...selected])}>
            Eliminar seleccionadas ({selected.size})
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-brand-600 border-t-transparent" /></div>
      ) : photos.length === 0 ? (
        <div className="card"><EmptyState icon={Images} title="Sin fotos" description="No hay fotos con esos filtros." /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {photos.map((p) => {
            const on = selected.has(p.id);
            return (
              <div key={p.id} className={clsx('rounded-xl overflow-hidden border bg-white', on ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-gray-200')}>
                <div className="relative aspect-square bg-gray-100">
                  <img src={p.thumbnailUrl || p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-label="Seleccionar"
                    className={clsx('absolute top-2 left-2 h-6 w-6 rounded-md border flex items-center justify-center', on ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white/90 border-gray-300')}
                  >
                    {on && <Check size={14} />}
                  </button>
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <a href={p.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md bg-black/55 text-white"><Eye size={12} /></a>
                    <button type="button" onClick={() => setConfirm([p.id])} className="p-1.5 rounded-md bg-black/55 text-white hover:bg-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="p-2 text-[11px] leading-tight">
                  <Link to={`/work-orders/${p.workOrderId}`} className="font-semibold text-brand-700">{p.workOrder?.orderNumber}</Link>
                  <p className="text-gray-500 truncate">{p.slot?.label || p.tag || (p.phase === 'DELIVERY' ? 'Entrega' : 'Recepción / general')}</p>
                  <p className="text-gray-400">{fDateTime(p.createdAt)} · {formatBytes(p.bytes)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {pagination && <Pagination {...pagination} onPageChange={(n) => { setPage(n); setSelected(new Set()); }} />}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => delMut.mutate(confirm)}
        loading={delMut.isPending}
        title="Eliminar fotos del servidor"
        message={`¿Eliminar ${confirm?.length || 0} foto(s) definitivamente? Dejarán de verse en las órdenes y para el cliente. No se puede deshacer.`}
      />
    </div>
  );
}

function Catalog() {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const [label, setLabel] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['photo-templates-all', workshopId],
    queryFn: () => getPhotoTemplates(workshopId, true).then((r) => r.data),
    enabled: !!workshopId,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['photo-templates-all', workshopId] });
    qc.invalidateQueries({ queryKey: ['photo-templates', workshopId] });
  };
  const fail = (e) => toast.error(e.message || 'Ocurrió un error');

  const addMut = useMutation({ mutationFn: () => createPhotoTemplate(workshopId, label.trim()), onSuccess: () => { setLabel(''); refresh(); }, onError: fail });
  const toggleMut = useMutation({ mutationFn: (t) => updatePhotoTemplate(workshopId, t.id, { isActive: !t.isActive }), onSuccess: refresh, onError: fail });
  const delMut = useMutation({ mutationFn: (id) => deletePhotoTemplate(workshopId, id), onSuccess: refresh, onError: fail });

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-gray-500">Lista de fotos que supervisores y administradores pueden pedir al técnico en cada orden. Desactiva las que no uses o agrega nuevas.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (label.trim()) addMut.mutate(); }} className="flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Nueva foto, ej. Banda de distribución"
          className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500" />
        <Button type="submit" icon={Plus} loading={addMut.isPending} disabled={!label.trim()}>Agregar</Button>
      </form>
      <div className="card divide-y divide-gray-100">
        {isLoading ? <p className="p-4 text-sm text-gray-400">Cargando…</p> : (data || []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <p className={clsx('flex-1 text-sm', t.isActive ? 'text-gray-900' : 'text-gray-400 line-through')}>{t.label}</p>
            <button onClick={() => toggleMut.mutate(t)} className="text-xs text-gray-500 underline">{t.isActive ? 'Desactivar' : 'Activar'}</button>
            <button onClick={() => delMut.mutate(t.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Eliminar"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PhotosPage() {
  const [tab, setTab] = useState('gallery');
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Almacenamiento</p>
        <h1 className="page-title">Fotos</h1>
        <p className="page-subtitle">Revisa lo guardado en el servidor, elimina fotos y administra la lista de fotos requeridas</p>
      </div>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['gallery', 'Galería'], ['catalog', 'Catálogo de fotos requeridas']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>{l}</button>
        ))}
      </div>
      {tab === 'gallery' ? <Gallery /> : <Catalog />}
    </div>
  );
}
