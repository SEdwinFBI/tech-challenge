import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface NumberedPaginationProps {
  page: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pagesToShow(page: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach(n => set.add(n));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach(n => set.add(n));
  const sorted = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

export const NumberedPagination: React.FC<NumberedPaginationProps> = ({
  page,
  totalRecords,
  pageSize,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  if (totalPages <= 1) return null;
  const btn = 'flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-bold transition';

  return (
    <nav aria-label="Paginación" className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
        className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40`}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      {pagesToShow(page, totalPages).map((n, i) =>
        n === 'gap' ? (
          <span key={`g${i}`} className="px-1 text-slate-400" aria-hidden="true">…</span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Página ${n}`}
            className={`${btn} ${n === page ? 'bg-brand text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Página siguiente"
        className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40`}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </nav>
  );
};
