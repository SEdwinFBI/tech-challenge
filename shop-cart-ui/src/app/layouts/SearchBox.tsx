import React, { useEffect, useRef, useState } from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ImageOff, Search, X } from 'lucide-react';
import { catalogApi } from '@/features/catalog/api/catalogApi';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { PriceTag } from '@/shared/ui/PriceTag';

export const SearchBox: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLFormElement>(null);
  const term = useDebounce(value.trim(), 250);

  const { data, isFetching } = useQuery({
    queryKey: ['search-suggestions', term],
    queryFn: () => catalogApi.getProducts({ q: term, tamanoPagina: 5 }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

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

  const items = data?.items ?? [];
  const showPanel = open && term.length >= 2;

  return (
    <form ref={wrapRef} onSubmit={submit} role="search" className={`relative ${className}`}>
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
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}
          placeholder="Buscar productos"
          aria-label="Buscar en la tienda"
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
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-slate-200 animate-fade-up">
          {isFetching && items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Buscando…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              Sin resultados para “{term}”.
            </p>
          ) : (
            <ul>
              {items.map(p => (
                <li key={p.IDProducto}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/producto/${p.IDProducto}`);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-canvas">
                      {p.ImagenUrl ? (
                        <SafeImage src={p.ImagenUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-slate-300" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{p.Nombre}</span>
                      <span className="block truncate text-xs text-slate-400">{p.Categoria}</span>
                    </span>
                    <PriceTag amount={p.PrecioOferta ?? p.PrecioMinimo} size="sm" tone={p.PrecioOferta ? 'sale' : 'default'} />
                  </button>
                </li>
              ))}
              <li className="border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-brand hover:bg-brand-soft"
                >
                  Ver todos
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </form>
  );
};
