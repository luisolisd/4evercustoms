import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, loading, variant = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirmar acción'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>Confirmar</Button>
        </>
      }
    >
      <div className="flex gap-4 items-start">
        <div className="shrink-0 p-2 bg-red-50 rounded-full">
          <AlertTriangle size={20} className="text-red-600" />
        </div>
        <p className="text-sm text-gray-700 leading-relaxed pt-1">{message}</p>
      </div>
    </Modal>
  );
}
