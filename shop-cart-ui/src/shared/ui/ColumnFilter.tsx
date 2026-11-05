import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { filterKeys, isFilterActive, type FilterDef, type FilterValues } from '../lib/columnFilters';

export interface ColumnFilterProps {
  def: FilterDef;
  values: FilterValues;
  onChange: (patch: FilterValues) => void;
}

const POPOVER_WIDTH = 288;
const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
const labelClass = 'mb-1 block text-xs font-semibold normal-case tracking-normal text-slate-600';

/** Campo de texto: aplica tras 400 ms o con Enter. */
const DebouncedField: React.FC<{
  value: string;
  onCommit: (v: string) => void;
  label: string;
  type?: 'text' | 'number';
  placeholder?: string;
  invalid?: boolean;
  onDraft?: (v: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}> = ({ value, onCommit, label, type = 'text', placeholder, invalid, onDraft, inputRef }) => {
  const [draft, setDraft] = useState(value);
  const debounced = useDebounce(draft, 400);
  const latest = useRef({ draft, value, onCommit, invalid });
  latest.current = { draft, value, onCommit, invalid };

  useEffect(() => {
    if (debounced !== latest.current.value && !latest.current.invalid) latest.current.onCommit(debounced);
  }, [debounced, invalid]);

  // Sigue el valor si cambia desde fuera (chip o "Limpiar")
  useEffect(() => {
    if (value !== debounced) {
      setDraft(value);
      onDraft?.(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cerrar con cambios sin aplicar, se aplican
  useEffect(
    () => () => {
      const l = latest.current;
      if (l.draft !== l.value && !l.invalid) l.onCommit(l.draft);
    },
    [],
  );

  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        ref={inputRef}
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        value={draft}
        placeholder={placeholder}
        onChange={e => {
          setDraft(e.target.value);
          onDraft?.(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !invalid) {
            e.preventDefault();
            onCommit(draft);
          }
        }}
        aria-invalid={invalid || undefined}
        className={`${fieldClass} ${invalid ? 'border-rose-500' : ''}`}
      />
    </label>
  );
};

/** Mínimo y máximo: avisa al escribir, aunque aún no esté aplicado. */
const RangeBody: React.FC<{ def: Extract<FilterDef, { type: 'rango' }>; values: FilterValues; onChange: (p: FilterValues) => void; firstRef: React.Ref<HTMLElement> }> = ({ def, values, onChange, firstRef }) => {
  const min = values[def.keyMin] ?? '';
  const max = values[def.keyMax] ?? '';
  const [dMin, setDMin] = useState(min);
  const [dMax, setDMax] = useState(max);
  const invalid = dMin !== '' && dMax !== '' && Number(dMin) > Number(dMax);
  const unit = def.prefix ? ` (${def.prefix})` : '';
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <DebouncedField label={`Mínimo${unit}`} type="number" value={min} invalid={invalid} onDraft={setDMin} onCommit={v => onChange({ [def.keyMin]: v })} inputRef={firstRef as React.Ref<HTMLInputElement>} />
        <DebouncedField label={`Máximo${unit}`} type="number" value={max} invalid={invalid} onDraft={setDMax} onCommit={v => onChange({ [def.keyMax]: v })} />
      </div>
      {invalid && (
        <p role="alert" className="text-xs font-medium normal-case tracking-normal text-rose-600">
          El mínimo no puede ser mayor al máximo.
        </p>
      )}
    </div>
  );
};

const FilterBody: React.FC<ColumnFilterProps & { firstRef: React.Ref<HTMLElement> }> = ({ def, values, onChange, firstRef }) => {
  switch (def.type) {
    case 'texto':
      return (
        <DebouncedField
          label={def.label}
          placeholder={def.placeholder ?? 'Escribe para filtrar'}
          value={values[def.key] ?? ''}
          onCommit={v => onChange({ [def.key]: v.trim() === '' ? '' : v })}
          inputRef={firstRef as React.Ref<HTMLInputElement>}
        />
      );
    case 'opciones':
      return (
        <label className="block">
          <span className={labelClass}>{def.label}</span>
          <select
            ref={firstRef as React.Ref<HTMLSelectElement>}
            value={values[def.key] ?? ''}
            onChange={e => onChange({ [def.key]: e.target.value })}
            className={fieldClass}
          >
            <option value="">{def.allLabel ?? 'Todos'}</option>
            {def.options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'fechas': {
      const desde = values[def.keyDesde] ?? '';
      const hasta = values[def.keyHasta] ?? '';
      return (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Desde</span>
            <input
              ref={firstRef as React.Ref<HTMLInputElement>}
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={e => onChange(e.target.value && hasta && e.target.value > hasta ? { [def.keyDesde]: e.target.value, [def.keyHasta]: e.target.value } : { [def.keyDesde]: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Hasta</span>
            <input type="date" value={hasta} min={desde || undefined} onChange={e => onChange(e.target.value && desde && e.target.value < desde ? { [def.keyDesde]: e.target.value, [def.keyHasta]: e.target.value } : { [def.keyHasta]: e.target.value })} className={fieldClass} />
          </label>
        </div>
      );
    }
    case 'rango':
      return <RangeBody def={def} values={values} onChange={onChange} firstRef={firstRef} />;
  }
};

/** Embudo de cabecera: abre el popover de filtro de la columna. */
export const ColumnFilter: React.FC<ColumnFilterProps> = ({ def, values, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: POPOVER_WIDTH });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLElement>(null);
  const popoverId = useId();
  const active = isFilterActive(def, values);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPos({ top: rect.bottom + 6, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Foco en el primer campo al abrir
  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close(true);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    // Foco atrapado dentro del popover
    const items = popoverRef.current?.querySelectorAll<HTMLElement>('input, select, button:not([disabled])');
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const clear = () => {
    onChange(Object.fromEntries(filterKeys(def).map(k => [k, ''])));
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Filtrar por ${def.label}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popoverId : undefined}
        title={active ? `Filtro activo en ${def.label}` : `Filtrar por ${def.label}`}
        className={`relative inline-flex h-6 w-6 items-center justify-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
          active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700'
        }`}
      >
        <Filter className="h-3.5 w-3.5" aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
        {active && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" aria-hidden="true" />}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label={`Filtro de ${def.label}`}
            onKeyDown={onKeyDown}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-lg"
          >
            <FilterBody def={def} values={values} onChange={onChange} firstRef={firstRef} />
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={clear}
                className={`rounded px-1 text-xs font-semibold normal-case tracking-normal focus-visible:outline-2 focus-visible:outline-indigo-500 ${active ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400'}`}
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="rounded px-1 text-xs font-semibold normal-case tracking-normal text-indigo-700 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-indigo-500"
              >
                Listo
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

/** Cabecera sin orden, solo con filtro. */
export const FilterableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement> & { filter: ColumnFilterProps; children: React.ReactNode }
> = ({ filter, children, className = '', ...props }) => (
  <th className={`px-4 py-3 font-semibold ${className}`} {...props}>
    <span className="inline-flex items-center gap-1.5">
      <span className="uppercase tracking-wider">{children}</span>
      <ColumnFilter {...filter} />
    </span>
  </th>
);
