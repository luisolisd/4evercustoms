import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages_ = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) pages_.push(i);

  const arrow = 'h-11 w-11 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-xl border border-gray-200 sm:border-0 hover:bg-gray-100 disabled:opacity-40';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span className="min-w-0">
        <span className="hidden sm:inline">Mostrando </span>
        <span className="font-semibold text-gray-700">{from}–{to}</span> de {total}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={arrow} aria-label="Anterior">
          <ChevronLeft size={18} />
        </button>
        {/* En celular solo "página x de y"; los números aparecen desde tablet */}
        <span className="sm:hidden px-2 text-xs font-semibold text-gray-600">{page} / {pages}</span>
        <div className="hidden sm:flex items-center gap-1">
          {pages_[0] > 1 && <span className="px-2">…</span>}
          {pages_.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'min-w-[34px] h-8 rounded-lg px-2 font-semibold transition',
                p === page ? 'bg-brand-gradient text-white shadow-glow' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </button>
          ))}
          {pages_[pages_.length - 1] < pages && <span className="px-2">…</span>}
        </div>
        <button onClick={() => onPageChange(page + 1)} disabled={page === pages} className={arrow} aria-label="Siguiente">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
