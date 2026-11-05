import React from 'react';
import { X } from 'lucide-react';
import { filterKeys, filterSummary, type FilterDef, type FilterValues } from '../lib/columnFilters';

export interface FilterChipsProps {
  defs: FilterDef[];
  values: FilterValues;
  onChange: (patch: FilterValues) => void;
  onClearAll: () => void;
}

/** Chips de filtros activos; no pinta nada si no hay ninguno. */
export const FilterChips: React.FC<FilterChipsProps> = ({ defs, values, onChange, onClearAll }) => {
  const chips = defs.flatMap(def => {
    const text = filterSummary(def, values);
    return text ? [{ def, text }] : [];
  });
  if (chips.length === 0) return null;

  return (
    <div role="group" aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
      {chips.map(({ def, text }) => (
        <span
          key={filterKeys(def).join('|')}
          data-testid="filter-chip"
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200"
        >
          <span className="truncate">{text}</span>
          <button
            type="button"
            onClick={() => onChange(Object.fromEntries(filterKeys(def).map(k => [k, ''])))}
            aria-label={`Quitar filtro ${def.label}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="rounded px-1 text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        Limpiar filtros
      </button>
    </div>
  );
};
