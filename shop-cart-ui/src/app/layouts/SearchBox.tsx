import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { SearchSuggestionsPanel } from '@/features/catalog/components/SearchSuggestionsPanel';

export const SearchBox: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLFormElement>(null);
  const panelId = useId();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate(value.trim() ? `/catalogo?q=${encodeURIComponent(value.trim())}` : '/catalogo');
  };

  const showPanel = open && value.trim().length >= 2;

  return (
    <form ref={wrapRef} onSubmit={submit} role="search" className={`relative ${className}`}
      onKeyDown={e => e.key === 'Escape' && setOpen(false)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <div className="flex h-11 items-center rounded-full bg-white pl-4 pr-1 shadow-sm ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-cta">
        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar productos"
          aria-label="Buscar en la tienda"
          aria-expanded={showPanel}
          aria-controls={showPanel ? panelId : undefined}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setOpen(false);
            }}
            aria-label="Limpiar búsqueda"
            className="mr-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Buscar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-cta text-cta-fg transition hover:bg-cta-hover"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {showPanel && (
        <div id={panelId} role="region" aria-label="Sugerencias de búsqueda"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl bg-white shadow-lift ring-1 ring-slate-200 animate-fade-up">
          <SearchSuggestionsPanel value={value} onSelect={id => { setOpen(false); navigate(`/producto/${id}`); }} />
          <div className="border-t border-slate-100">
            <button type="submit" className="w-full px-4 py-2.5 text-left text-xs font-bold text-brand hover:bg-brand-soft">Ver todos</button>
          </div>
        </div>
      )}
    </form>
  );
};
