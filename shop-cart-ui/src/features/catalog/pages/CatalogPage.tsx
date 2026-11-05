import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { catalogApi } from '../api/catalogApi';
import { useCategories } from '../hooks/useCatalog';
import { ORDER_OPTIONS, PAGE_SIZE, useCatalogFilters, type CatalogMode, type CatalogOrder } from '../hooks/useCatalogFilters';
import { FilterPanel } from '../components/FilterPanel';
import { ProductCard, ProductCardSkeletonV2 } from '../components/ProductCard';
import { ErrorState, Illustration, NumberedPagination } from '@/shared/ui';
import { formatMoney, plural } from '@/shared/lib/formatters';

export interface CatalogPageProps {
  mode?: CatalogMode;
}

const Chip: React.FC<{ label: string; onRemove?: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1.5 pl-3 pr-2 text-xs font-bold text-slate-700">
    {label}
    {onRemove && (
      <button type="button" onClick={onRemove} aria-label={`Quitar filtro ${label}`} className="rounded-full p-0.5 hover:bg-slate-200">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </span>
);

export const CatalogPage: React.FC<CatalogPageProps> = ({ mode = 'all' }) => {
  const { id } = useParams();
  const routeCategory = id ? Number(id) : undefined;
  const { filters, params, set, clear, activeCount } = useCatalogFilters(mode, routeCategory);
  const { data: categories = [] } = useCategories();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useQuery({
    queryKey: ['products', params],
    queryFn: () => catalogApi.getProducts(params),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.totalRegistros ?? 0;
  const category = categories.find(c => c.IDCategoria === filters.categoria);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filters.pagina]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const title =
    mode === 'ofertas'
      ? 'Ofertas'
      : mode === 'novedades'
        ? 'Lo nuevo'
        : mode === 'categoria'
          ? category?.Nombre ?? 'Categoría'
          : filters.q
            ? `Resultados para “${filters.q}”`
            : 'Todo el catálogo';

  const subtitle = mode === 'categoria' ? category?.Descripcion : undefined;

  const panel = (
    <FilterPanel
      mode={mode}
      filters={filters}
      categories={categories}
      onChange={patch => set(patch)}
      onClear={() => {
        clear();
        setDrawerOpen(false);
      }}
      activeCount={activeCount}
    />
  );

  return (
    <div className="animate-fade-up">
      {mode === 'categoria' && category && (
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white sm:p-10">
          {category.ImagenUrl && (
            <img src={category.ImagenUrl} alt="" className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-40 [mask-image:linear-gradient(to_left,black,transparent)] sm:block" />
          )}
          <div className="relative max-w-xl">
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{category.Nombre}</h1>
            {category.Descripcion && <p className="mt-2 text-sm text-white/85">{category.Descripcion}</p>}
            {category.TotalProductos != null && (
              <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{plural(category.TotalProductos, 'producto')}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[16.5rem_1fr]">
        <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--header-h,7rem)+1rem)] lg:max-h-[calc(100vh-var(--header-h,7rem)-2rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          {panel}
        </aside>

        <div className="min-w-0">
          {!(mode === 'categoria' && category) && (
            <div className="mb-4">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500" aria-live="polite">
              {query.isLoading ? 'Buscando…' : <><strong className="text-slate-900">{total}</strong> {total === 1 ? 'producto' : 'productos'}</>}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filtros{activeCount > 0 && ` (${activeCount})`}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only sm:not-sr-only text-slate-500">Ordenar</span>
                <select
                  value={filters.orden}
                  onChange={e => set({ orden: e.target.value as CatalogOrder })}
                  className="h-10 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {ORDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Filtros activos">
              {filters.q && <Chip label={`“${filters.q}”`} onRemove={() => set({ q: undefined })} />}
              {mode !== 'categoria' && filters.categoria && (
                <Chip label={category?.Nombre ?? 'Categoría'} onRemove={() => set({ categoria: undefined })} />
              )}
              {(filters.min != null || filters.max != null) && (
                <Chip
                  label={`${filters.min != null ? formatMoney(filters.min) : 'Q 0'} – ${filters.max != null ? formatMoney(filters.max) : 'sin tope'}`}
                  onRemove={() => set({ min: undefined, max: undefined })}
                />
              )}
              {filters.disp && <Chip label="Con existencia" onRemove={() => set({ disp: false })} />}
              {mode !== 'ofertas' && filters.ofertas && <Chip label="En oferta" onRemove={() => set({ ofertas: false })} />}
              {mode !== 'novedades' && filters.nuevos && <Chip label="Lo nuevo" onRemove={() => set({ nuevos: false })} />}
              <button type="button" onClick={clear} className="text-xs font-bold text-brand hover:underline">Limpiar todo</button>
            </div>
          )}

          {query.isError && !query.data ? (
            <ErrorState
              title="Error al cargar productos"
              onRetry={() => query.refetch()}
            />
          ) : query.isLoading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeletonV2 key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-canvas px-6 py-14 text-center">
              <Illustration name="search" />
              <h2 className="mt-4 text-lg font-extrabold text-slate-900">Sin resultados</h2>
              {(activeCount > 0 || mode !== 'all') && (
                <button type="button" onClick={clear} className="mt-5 h-11 rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div
              className={`grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity md:grid-cols-3 xl:grid-cols-4 ${query.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {items.map(p => <ProductCard key={p.IDProducto} product={p} />)}
            </div>
          )}

          <NumberedPagination
            className="mt-10"
            page={filters.pagina}
            totalRecords={total}
            pageSize={PAGE_SIZE}
            onPageChange={p => set({ pagina: p }, true)}
          />
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-lift">
            <div className="flex-1 overflow-y-auto p-5">{panel}</div>
            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-12 w-full rounded-full bg-cta text-sm font-extrabold text-cta-fg"
              >
                Ver {total} {total === 1 ? 'producto' : 'productos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
