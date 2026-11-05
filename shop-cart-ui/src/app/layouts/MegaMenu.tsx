import React, { useEffect, useRef, useState } from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LayoutGrid, X } from 'lucide-react';
import { useCategories } from '@/features/catalog/hooks/useCatalog';
import { catalogApi } from '@/features/catalog/api/catalogApi';
import { PriceTag } from '@/shared/ui/PriceTag';

export interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ open, onClose }) => {
  const { data: categories = [], isLoading } = useCategories();
  const active = categories.filter(c => c.Activo !== false);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const currentId = hoverId ?? active[0]?.IDCategoria ?? null;
  const current = active.find(c => c.IDCategoria === currentId);

  const { data: preview, isFetching } = useQuery({
    queryKey: ['mega-preview', currentId],
    queryFn: () => catalogApi.getProducts({ idCategoria: currentId!, tamanoPagina: 4, orden: 'DESTACADOS' }),
    enabled: open && currentId != null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Categorías"
        className="fixed inset-x-0 top-[var(--header-h,7rem)] z-50 mx-auto max-h-[75vh] w-full max-w-7xl overflow-hidden rounded-b-3xl bg-white shadow-lift animate-fade-up md:top-[var(--header-h,7rem)] md:w-[calc(100%-2rem)]"
      >
        <div className="grid max-h-[75vh] grid-cols-1 md:grid-cols-[18rem_1fr]">
          <div className="overflow-y-auto border-r border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between px-3 pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Todas las categorías</p>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 md:hidden">
                <X className="h-4 w-4" />
              </button>
            </div>
            {isLoading && <p className="px-3 py-2 text-sm text-slate-400">Cargando…</p>}
            <ul>
              {active.map(c => (
                <li key={c.IDCategoria}>
                  <Link
                    to={`/categoria/${c.IDCategoria}`}
                    onClick={onClose}
                    onMouseEnter={() => setHoverId(c.IDCategoria)}
                    onFocus={() => setHoverId(c.IDCategoria)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      c.IDCategoria === currentId ? 'bg-brand-soft text-brand' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas">
                      {c.ImagenUrl ? (
                        <SafeImage src={c.ImagenUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <LayoutGrid className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.Nombre}</span>
                    {c.TotalProductos != null && <span className="text-xs font-medium text-slate-400">{c.TotalProductos}</span>}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden overflow-y-auto p-6 md:block">
            {current && (
              <>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">{current.Nombre}</h3>
                    {current.Descripcion && <p className="text-sm text-slate-500">{current.Descripcion}</p>}
                  </div>
                  <Link
                    to={`/categoria/${current.IDCategoria}`}
                    onClick={onClose}
                    className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Ver todo
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {(preview?.items ?? []).map(p => (
                    <Link key={p.IDProducto} to={`/producto/${p.IDProducto}`} onClick={onClose} className="group block">
                      <span className="block aspect-square overflow-hidden rounded-2xl bg-canvas">
                        {p.ImagenUrl && (
                          <SafeImage src={p.ImagenUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        )}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-xs font-semibold text-slate-700 group-hover:text-brand">{p.Nombre}</span>
                      <PriceTag amount={p.PrecioOferta ?? p.PrecioMinimo} size="sm" tone={p.PrecioOferta ? 'sale' : 'default'} />
                    </Link>
                  ))}
                  {isFetching && !preview && Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
                {!isFetching && (preview?.items ?? []).length === 0 && (
                  <p className="text-sm text-slate-400">Sin productos.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
