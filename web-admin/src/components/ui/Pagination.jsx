import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages_ = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) pages_.push(i);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
      <span>Mostrando {from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        {pages_[0] > 1 && <span className="px-2">…</span>}
        {pages_.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={clsx(
              'min-w-[32px] h-8 rounded px-2 font-medium',
              p === page ? 'bg-brand-600 text-white' : 'hover:bg-gray-100'
            )}
          >
            {p}
          </button>
        ))}
        {pages_[pages_.length - 1] < pages && <span className="px-2">…</span>}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
