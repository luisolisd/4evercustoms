import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, Eye, Trash2, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import ConfirmDialog from './ui/ConfirmDialog';
import { uploadWOPhotos, deletePhoto } from '../services/workOrders';
import { compressImage } from '../utils/image';
import { useToast } from '../hooks/useToast';

// Daños y observaciones que se registran al recibir el vehículo
export const DAMAGE_TAGS = ['Golpe', 'Rayón', 'Abolladura', 'Estrellado', 'Faltante', 'Pintura', 'Rotura', 'Óxido'];

export default function DamagePanel({ order, workshopId, canDelete, onChanged }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [tag, setTag] = useState(DAMAGE_TAGS[0]);
  const [other, setOther] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const photos = (order.photos || []).filter((p) => p.phase === 'RECEPTION' && !p.slotId);
  const finalTag = tag === 'Otro' ? other.trim() : tag;

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !finalTag) return;
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('photos', await compressImage(f));
      fd.append('phase', 'RECEPTION');
      fd.append('tag', finalTag);
      if (note.trim()) fd.append('caption', note.trim());
      await uploadWOPhotos(workshopId, order.id, fd);
      setNote('');
      toast.success('Foto registrada');
      onChanged();
    } catch (err) {
      toast.error(err.message || 'No se pudo subir la foto');
    } finally {
      setBusy(false);
    }
  };

  const delMut = useMutation({
    mutationFn: (id) => deletePhoto(workshopId, id),
    onSuccess: () => { onChanged(); setDeleting(null); toast.success('Foto eliminada'); },
    onError: (e) => toast.error(e.message || 'No se pudo eliminar'),
  });

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFiles} />

      <div>
        <p className="text-sm font-semibold text-gray-800">Daños y observaciones</p>
        <p className="text-xs text-gray-500">Elige el tipo, escribe dónde está (opcional) y toma la foto. Repite por cada daño.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[...DAMAGE_TAGS, 'Otro'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              tag === t ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
            )}
          >
            {t === 'Otro' ? 'Otro (especificar)' : t}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {tag === 'Otro' && (
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={40}
            placeholder="Especifica el daño u observación"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        )}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Ubicación o detalle (ej. puerta trasera derecha)"
          className={clsx('border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30', tag !== 'Otro' && 'sm:col-span-2')}
        />
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || !finalTag}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        Tomar foto de {finalTag ? finalTag.toLowerCase() : 'daño'}
      </button>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="rounded-xl overflow-hidden border border-gray-200 bg-white">
              <div className="relative aspect-square bg-gray-100">
                <img src={p.thumbnailUrl || p.url} alt={p.tag || ''} className="w-full h-full object-cover" loading="lazy" />
                <span className="absolute top-2 left-2 rounded-full bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5">{p.tag || 'General'}</span>
                <div className="absolute bottom-1 right-1 flex gap-1">
                  <a href={p.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md bg-black/55 text-white"><Eye size={12} /></a>
                  {canDelete && (
                    <button type="button" onClick={() => setDeleting(p)} className="p-1.5 rounded-md bg-black/55 text-white hover:bg-red-600"><Trash2 size={12} /></button>
                  )}
                </div>
              </div>
              {p.caption && <p className="p-2 text-[11px] text-gray-500 leading-tight">{p.caption}</p>}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => delMut.mutate(deleting.id)}
        loading={delMut.isPending}
        title="Eliminar foto"
        message="¿Eliminar esta foto del servidor? No se puede deshacer."
      />
    </div>
  );
}
