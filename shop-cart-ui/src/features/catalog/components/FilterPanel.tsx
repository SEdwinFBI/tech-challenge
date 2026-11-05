import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { Category } from '@/shared/types/domain';
import type { CatalogFilters, CatalogMode } from '../hooks/useCatalogFilters';

export interface FilterPanelProps {
  mode: CatalogMode;
  filters: CatalogFilters;
  categories: Category[];
  onChange: (patch: Partial<Record<keyof CatalogFilters, string | number | boolean | undefined>>) => void;
  onClear: () => void;
  activeCount: number;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <details open className="group border-b border-slate-100 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-extrabold text-slate-900">
      {title}
      <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
    </summary>
    <div className="mt-3">{children}</div>
  </details>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <label className={`flex items-center justify-between gap-3 text-sm font-medium text-slate-700 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    {label}
    <span className="relative inline-flex">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  </label>
);

export const FilterPanel: React.FC<FilterPanelProps> = ({ mode, filters, categories, onChange, onClear, activeCount }) => {
  const [min, setMin] = useState(filters.min?.toString() ?? '');
  const [max, setMax] = useState(filters.max?.toString() ?? '');

  useEffect(() => {
    setMin(filters.min?.toString() ?? '');
    setMax(filters.max?.toString() ?? '');
  }, [filters.min, filters.max]);

  const applyPrice = () => {
    const lo = min.trim() === '' ? undefined : Number(min);
    const hi = max.trim() === '' ? undefined : Number(max);
    if ((lo != null && !Number.isFinite(lo)) || (hi != null && !Number.isFinite(hi))) return;
    onChange({ min: lo, max: hi });
  };

  const input =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold tabular text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-extrabold text-slate-900">Filtros</h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs font-bold text-brand hover:underline">
            Limpiar todo ({activeCount})
          </button>
        )}
      </div>

      {mode !== 'categoria' && (
        <Section title="Categoría">
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => onChange({ categoria: undefined })}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition ${
                  !filters.categoria ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas {!filters.categoria && <Check className="h-4 w-4" />}
              </button>
            </li>
            {categories
              .filter(c => c.Activo !== false)
              .map(c => (
                <li key={c.IDCategoria}>
                  <button
                    type="button"
                    onClick={() => onChange({ categoria: c.IDCategoria })}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition ${
                      filters.categoria === c.IDCategoria ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{c.Nombre}</span>
                    {c.TotalProductos != null && <span className="text-xs font-medium text-slate-400">{c.TotalProductos}</span>}
                  </button>
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Section title="Precio">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Mínimo</span>
            <input
              inputMode="decimal"
              value={min}
              onChange={e => setMin(e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={applyPrice}
              onKeyDown={e => e.key === 'Enter' && applyPrice()}
              placeholder="0"
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Máximo</span>
            <input
              inputMode="decimal"
              value={max}
              onChange={e => setMax(e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={applyPrice}
              onKeyDown={e => e.key === 'Enter' && applyPrice()}
              placeholder="Sin tope"
              className={input}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { label: 'Hasta Q200', min: undefined, max: 200 },
            { label: 'Q200 a Q500', min: 200, max: 500 },
            { label: 'Más de Q500', min: 500, max: undefined },
          ].map(r => (
            <button
              key={r.label}
              type="button"
              onClick={() => onChange({ min: r.min, max: r.max })}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Disponibilidad">
        <div className="space-y-3">
          <Toggle label="Solo con existencia" checked={filters.disp} onChange={v => onChange({ disp: v })} />
          <Toggle
            label="Solo en oferta"
            checked={filters.ofertas}
            disabled={mode === 'ofertas'}
            onChange={v => onChange({ ofertas: v })}
          />
          <Toggle
            label="Solo lo nuevo"
            checked={filters.nuevos}
            disabled={mode === 'novedades'}
            onChange={v => onChange({ nuevos: v })}
          />
        </div>
      </Section>
    </div>
  );
};
