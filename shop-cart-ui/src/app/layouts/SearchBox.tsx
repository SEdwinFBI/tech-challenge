import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, X } from 'lucide-react';
import { SearchSuggestionsPanel, type SearchOption } from '@/features/catalog/components/SearchSuggestionsPanel';
import { useRecentSearches } from '@/features/catalog/hooks/useRecentSearches';
import { optionDomId, useSearchSuggestions } from '@/features/catalog/hooks/useSearchSuggestions';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface ComboboxProps {
  variant: 'inline' | 'sheet';
  onDone?: () => void;
  onClose?: () => void;
}

const SearchCombobox: React.FC<ComboboxProps> = ({ variant, onDone, onClose }) => {
  const navigate = useNavigate();
  const sheet = variant === 'sheet';
  const listId = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(sheet);
  const [focused, setFocused] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useRecentSearches();
  const s = useSearchSuggestions(value, open);

  const options = useMemo<SearchOption[]>(() => {
    const list: SearchOption[] = s.items.map(product => ({ key: `p-${product.IDProducto}`, kind: 'product', product }));
    if (s.recommendation) list.push({ key: `r-${s.recommendation.IDProducto}`, kind: 'recommendation', product: s.recommendation });
    s.categories.forEach(category => list.push({ key: `c-${category.IDCategoria}`, kind: 'category', category }));
    const typed = fold(s.input);
    recent.items
      .filter(t => !typed || (fold(t).includes(typed) && fold(t) !== typed))
      .slice(0, s.active ? 3 : 5)
      .forEach(term => list.push({ key: `h-${encodeURIComponent(term)}`, kind: 'recent', term }));
    if (s.input) list.push({ key: 'all', kind: 'all', term: s.input });
    return list;
  }, [s.items, s.recommendation, s.categories, s.input, s.active, recent.items]);

  const noResults = s.active && !s.loading && !s.stale && !s.failed && s.items.length === 0 && !s.recommendation && s.categories.length === 0;
  const hint = sheet && !s.input && options.length === 0 ? 'Escribe el nombre de un producto o una categoría.' : null;
  const showPanel = open && (sheet || options.length > 0 || noResults);

  const finish = useCallback(() => {
    setOpen(false);
    setActiveKey(null);
    onDone?.();
  }, [onDone]);

  const search = (term: string) => {
    const t = term.trim();
    recent.add(t);
    finish();
    navigate(t ? `/catalogo?q=${encodeURIComponent(t)}` : '/catalogo');
  };

  const select = (o: SearchOption) => {
    if (o.kind === 'product' || o.kind === 'recommendation') {
      recent.add(s.input);
      finish();
      navigate(`/producto/${o.product.IDProducto}`);
    } else if (o.kind === 'category') {
      finish();
      navigate(`/categoria/${o.category.IDCategoria}`);
    } else {
      setValue(o.term);
      search(o.term);
    }
  };

  useEffect(() => {
    if (!sheet) {
      const onDown = (e: MouseEvent) => {
        if (formRef.current && !formRef.current.contains(e.target as Node)) {
          setOpen(false);
          setActiveKey(null);
        }
      };
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }
  }, [sheet]);

  useEffect(() => {
    if (sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);

  useEffect(() => {
    if (activeKey) document.getElementById(optionDomId(listId, activeKey))?.scrollIntoView({ block: 'nearest' });
  }, [activeKey, listId]);

  const activeOption = options.find(o => o.key === activeKey) ?? null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (options.length === 0) return;
      const i = options.findIndex(o => o.key === activeKey);
      const next = e.key === 'ArrowDown' ? (i + 1) % options.length : (i - 1 + options.length) % options.length;
      setActiveKey(options[next].key);
    } else if (e.key === 'Enter' && showPanel && activeOption) {
      e.preventDefault();
      select(activeOption);
    } else if (e.key === 'Escape') {
      if (sheet) onClose?.();
      else if (open) {
        e.preventDefault();
        setOpen(false);
        setActiveKey(null);
      } else if (value) setValue('');
    } else if (e.key === 'Delete' && activeOption?.kind === 'recent') {
      e.preventDefault();
      recent.remove(activeOption.term);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const clear = () => {
    setValue('');
    setActiveKey(null);
    setOpen(true);
    inputRef.current?.focus();
  };

  const panel = showPanel && (
    <SearchSuggestionsPanel
      listId={listId}
      query={s.input}
      options={options}
      activeKey={activeKey}
      loading={s.loading}
      stale={s.stale}
      recommendationLoading={s.recommendationLoading}
      noResults={noResults}
      hint={hint}
      onActivate={setActiveKey}
      onSelect={select}
      onRemoveRecent={recent.remove}
    />
  );

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={e => {
        e.preventDefault();
        search(value);
      }}
      onBlur={e => {
        if (!sheet && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      className={sheet ? 'flex min-h-0 flex-1 flex-col' : 'relative'}
    >
      <div className={`flex h-11 items-center rounded-full pl-4 pr-1 focus-within:ring-2 focus-within:ring-cta ${
        sheet ? 'bg-slate-100 ring-1 ring-slate-200' : 'bg-white shadow-sm ring-1 ring-black/5'
      }`}>
        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={value}
          autoFocus={sheet}
          onChange={e => {
            setValue(e.target.value);
            setActiveKey(null);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlurCapture={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder="Buscar productos"
          aria-label="Buscar en la tienda"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listId : undefined}
          aria-activedescendant={showPanel && activeKey ? optionDomId(listId, activeKey) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {value && (
          <button type="button" onClick={clear} aria-label="Limpiar búsqueda"
            className="mr-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {!sheet && !value && !focused && (
          <kbd aria-hidden="true" className="mr-2 hidden h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 text-xs font-bold text-slate-400 lg:inline-flex">/</kbd>
        )}
        <button type="submit" aria-label="Buscar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta text-cta-fg transition hover:bg-cta-hover">
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {sheet ? (
        <div className="-mx-4 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100" onMouseDown={e => e.preventDefault()}>
          {panel}
        </div>
      ) : showPanel && (
        <div
          onMouseDown={e => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-lift ring-1 ring-slate-200 animate-fade-up"
        >
          <div className="max-h-[min(70vh,30rem)] overflow-y-auto overscroll-contain">{panel}</div>
          <div className="hidden items-center gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 lg:flex" aria-hidden="true">
            <span><kbd className="font-bold">↑↓</kbd> moverte</span>
            <span><kbd className="font-bold">Enter</kbd> elegir</span>
            <span><kbd className="font-bold">Esc</kbd> cerrar</span>
          </div>
        </div>
      )}
    </form>
  );
};

export const SearchBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className}>
    <SearchCombobox variant="inline" />
  </div>
);

export const MobileSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir búsqueda"
        aria-haspopup="dialog"
        className="flex h-11 w-full items-center gap-2 rounded-full bg-white pl-4 pr-1 text-left text-sm text-slate-400 shadow-sm ring-1 ring-black/5"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">Buscar productos</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cta text-cta-fg" aria-hidden="true">
          <Search className="h-4 w-4" />
        </span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Buscar" className="fixed inset-0 z-[60] flex flex-col bg-white px-4 pt-3 text-slate-900 animate-fade-up">
          <div className="mb-3 flex items-center gap-1">
            <button type="button" onClick={close} aria-label="Cerrar búsqueda"
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-base font-extrabold">Buscar</span>
          </div>
          <SearchCombobox variant="sheet" onDone={close} onClose={close} />
        </div>
      )}
    </>
  );
};
