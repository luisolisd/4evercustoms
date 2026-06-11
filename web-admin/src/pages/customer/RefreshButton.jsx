import { RefreshCw } from 'lucide-react';

export default function RefreshButton({ onClick, spinning }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Recargar"
      className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 active:scale-95 transition"
    >
      <RefreshCw size={18} className={spinning ? 'animate-spin' : ''} />
    </button>
  );
}
