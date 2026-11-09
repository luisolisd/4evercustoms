import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import { getPhotoTemplates, createPhotoTemplate } from '../services/photos';
import { useToast } from '../hooks/useToast';

/**
 * Selector de las fotos que el técnico debe registrar.
 *  value:    { templateIds: string[], custom: string[] }
 *  disabledLabels: etiquetas que la orden ya tiene (no se pueden volver a elegir)
 */
export default function PhotoPicker({ value, onChange, disabledLabels = [] }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const [other, setOther] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['photo-templates', workshopId],
    queryFn: () => getPhotoTemplates(workshopId).then((r) => r.data),
    enabled: !!workshopId,
  });
  const templates = data || [];
  const taken = new Set(disabledLabels);

  const toggle = (id) => {
    const set = new Set(value.templateIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange({ ...value, templateIds: [...set] });
  };

  const addCustom = () => {
    const label = other.trim();
    if (!label) return;
    if (!value.custom.includes(label) && !taken.has(label)) onChange({ ...value, custom: [...value.custom, label] });
    setOther('');
  };

  const saveMut = useMutation({
    mutationFn: (label) => createPhotoTemplate(workshopId, label),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['photo-templates', workshopId] });
      const id = res.data.id;
      if (!value.templateIds.includes(id)) onChange({ ...value, templateIds: [...value.templateIds, id] });
      setOther('');
      toast.success('Agregada al catálogo');
    },
    onError: (e) => toast.error(e.message || 'No se pudo guardar'),
  });

  const selectedCount = value.templateIds.length + value.custom.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Fotos que debe registrar el técnico</p>
        <span className="text-xs text-gray-500">{selectedCount} seleccionada(s)</span>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400">Cargando lista…</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
          {templates.map((t) => {
            const disabled = taken.has(t.label);
            const on = value.templateIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(t.id)}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  disabled && 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-500',
                  !disabled && on && 'bg-brand-600 border-brand-600 text-white',
                  !disabled && !on && 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
                )}
              >
                {on && <Check size={12} />}
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {value.custom.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.custom.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 text-xs font-medium">
              Otro: {c}
              <button type="button" onClick={() => onChange({ ...value, custom: value.custom.filter((x) => x !== c) })} aria-label="Quitar">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-gray-300 p-3 space-y-2">
        <label className="block text-xs font-medium text-gray-600">Otro (especificar)</label>
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          maxLength={80}
          placeholder="Ej. Banda de distribución"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addCustom} disabled={!other.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-40">
            <Plus size={12} /> Solo en esta orden
          </button>
          <button type="button" onClick={() => saveMut.mutate(other.trim())} disabled={!other.trim() || saveMut.isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40">
            <Plus size={12} /> Guardar en el catálogo
          </button>
        </div>
      </div>
    </div>
  );
}
