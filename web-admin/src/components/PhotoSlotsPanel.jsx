import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, CheckCircle2, Circle, Eye, Trash2, Plus, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';
import PhotoPicker from './PhotoPicker';
import { uploadWOPhotos, deletePhoto } from '../services/workOrders';
import { addPhotoSlots, removePhotoSlot } from '../services/photos';
import { compressImage } from '../utils/image';
import { useToast } from '../hooks/useToast';

/**
 * Lista de fotos requeridas de una orden. Cada requerimiento muestra sus fotos y un botón para tomar/subir.
 *  canManage: supervisor/admin pueden agregar o quitar requerimientos y borrar fotos.
 *  Los técnicos solo suben fotos.
 */
export default function PhotoSlotsPanel({ order, workshopId, canManage, onChanged }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const activeSlot = useRef(null);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [spec, setSpec] = useState({ templateIds: [], custom: [] });
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  const slots = order.photoSlots || [];
  const done = slots.filter((s) => s.photos?.length > 0).length;

  const upload = async (files, slotId) => {
    setUploadingSlot(slotId);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('photos', await compressImage(f));
      fd.append('slotId', slotId);
      await uploadWOPhotos(workshopId, order.id, fd);
      toast.success('Foto guardada');
      onChanged();
    } catch (e) {
      toast.error(e.message || 'No se pudo subir la foto');
    } finally {
      setUploadingSlot(null);
    }
  };

  const pick = (slotId) => { activeSlot.current = slotId; inputRef.current?.click(); };
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length && activeSlot.current) upload(files, activeSlot.current);
  };

  const addMut = useMutation({
    mutationFn: () => addPhotoSlots(workshopId, order.id, { templateIds: spec.templateIds, custom: spec.custom }),
    onSuccess: () => { onChanged(); setPickerOpen(false); setSpec({ templateIds: [], custom: [] }); toast.success('Fotos requeridas actualizadas'); },
    onError: (e) => toast.error(e.message || 'No se pudo agregar'),
  });
  const removeSlotMut = useMutation({
    mutationFn: (slotId) => removePhotoSlot(workshopId, slotId),
    onSuccess: () => { onChanged(); toast.success('Requerimiento eliminado'); },
    onError: (e) => toast.error(e.message || 'No se pudo quitar'),
  });
  const delPhotoMut = useMutation({
    mutationFn: (photoId) => deletePhoto(workshopId, photoId),
    onSuccess: () => { onChanged(); setDeletingPhoto(null); toast.success('Foto eliminada'); },
    onError: (e) => toast.error(e.message || 'No se pudo eliminar'),
  });

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFiles} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Fotos requeridas</p>
          <p className="text-xs text-gray-500">{slots.length ? `${done} de ${slots.length} completas` : 'No se han solicitado fotos para esta orden'}</p>
        </div>
        {canManage && (
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPickerOpen(true)}>Solicitar fotos</Button>
        )}
      </div>

      {slots.length > 0 && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${(done / slots.length) * 100}%` }} />
        </div>
      )}

      <div className="space-y-3">
        {slots.map((s) => {
          const ok = s.photos?.length > 0;
          const busy = uploadingSlot === s.id;
          return (
            <div key={s.id} className={clsx('rounded-xl border p-3', ok ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white')}>
              <div className="flex items-center gap-2">
                {ok ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
                <p className="flex-1 text-sm font-medium text-gray-900">{s.label}</p>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  {ok ? 'Agregar' : 'Tomar foto'}
                </button>
                {canManage && (
                  <button type="button" onClick={() => removeSlotMut.mutate(s.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Quitar requerimiento">
                    <X size={14} />
                  </button>
                )}
              </div>
              {ok && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {s.photos.map((p) => (
                    <div key={p.id} className="relative rounded-lg overflow-hidden aspect-square bg-gray-100">
                      <img src={p.thumbnailUrl || p.url} alt={s.label} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <a href={p.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md bg-black/55 text-white"><Eye size={12} /></a>
                        {canManage && (
                          <button type="button" onClick={() => setDeletingPhoto(p)} className="p-1.5 rounded-md bg-black/55 text-white hover:bg-red-600"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Solicitar fotos al técnico" size="md">
        <div className="space-y-4">
          <PhotoPicker value={spec} onChange={setSpec} disabledLabels={slots.map((s) => s.label)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMut.mutate()} loading={addMut.isPending} disabled={!spec.templateIds.length && !spec.custom.length}>Agregar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingPhoto}
        onClose={() => setDeletingPhoto(null)}
        onConfirm={() => delPhotoMut.mutate(deletingPhoto.id)}
        loading={delPhotoMut.isPending}
        title="Eliminar foto"
        message="¿Eliminar esta foto del servidor? No se puede deshacer."
      />
    </div>
  );
}
