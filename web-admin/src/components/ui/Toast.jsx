import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import { useToastStore } from '../../store/toastStore';

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
};

const STYLES = {
  success: 'bg-white border-emerald-200 text-emerald-800 [&_svg:first-child]:text-emerald-500',
  error:   'bg-white border-red-200 text-red-800 [&_svg:first-child]:text-red-500',
  info:    'bg-white border-blue-200 text-blue-800 [&_svg:first-child]:text-blue-500',
};

function Toast({ id, type, message }) {
  const remove = useToastStore((s) => s.remove);
  const Icon = ICONS[type];

  useEffect(() => {
    const t = setTimeout(() => remove(id), 4000);
    return () => clearTimeout(t);
  }, [id, remove]);

  return (
    <div className={clsx('flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-elevated max-w-sm animate-slide-in-right', STYLES[type])}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={() => remove(id)} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => <Toast key={t.id} {...t} />)}
    </div>,
    document.body
  );
}
