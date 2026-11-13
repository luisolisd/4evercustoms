import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from './ui/Modal';
import QuoteItemForm from './forms/QuoteItemForm';
import { updateQuoteItem } from '../services/quotes';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';

/** Edita una línea de cotización existente. `item` null = cerrado. `invalidateKeys` = queries a refrescar. */
export default function EditQuoteItemModal({ item, quoteId, onClose, invalidateKeys = [] }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();

  const mut = useMutation({
    mutationFn: (data) => updateQuoteItem(workshopId, quoteId, item.id, data),
    onSuccess: () => {
      invalidateKeys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.success('Línea actualizada');
      onClose();
    },
    onError: (e) => toast.error(e.message || 'No se pudo actualizar'),
  });

  return (
    <Modal open={!!item} onClose={onClose} title="Editar línea" size="sm">
      {item && (
        <QuoteItemForm
          key={item.id}
          initial={item}
          submitLabel="Guardar cambios"
          onCancel={onClose}
          loading={mut.isPending}
          onSubmit={(d) => mut.mutate(d)}
        />
      )}
    </Modal>
  );
}
