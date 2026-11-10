import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { catalogApi } from '../api/catalogApi';
import { useCategories } from '../hooks/useCatalog';
import { ORDER_OPTIONS, PAGE_SIZE, useCatalogFilters, type CatalogMode, type CatalogOrder } from '../hooks/useCatalogFilters';
import { FilterPanel } from '../components/FilterPanel';
import { ProductCardSkeletonV2 } from '@/shared/ui/ProductCard';
import { ConnectedProductCard } from '../components/ConnectedProductCard';
import { Button, ErrorState, Skeleton, NumberedPagination } from '@/shared/ui';
import { formatMoney, plural } from '@/shared/lib/formatters';
import { queryKeys } from '@/shared/lib/queryKeys';
import { RecommendationRail, SearchRecommendation } from '@/features/recommendations';

export interface CatalogPageProps {
  mode?: CatalogMode;
}

const Chip: React.FC<{ label: string; onRemove?: () => void; tone?: 'filter' | 'query' }> = ({ label, onRemove, tone = 'filter' }) => (
  <span className={`inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-3 pr-1 text-xs font-bold ${
    tone === 'query' ? 'bg-brand text-white' : 'bg-brand-soft text-brand ring-1 ring-inset ring-brand/20'
  }`}>
    <span className="truncate">{label}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={tone === 'query' ? 'Quitar búsqueda' : `Quitar filtro ${label}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone === 'query' ? 'hover:bg-white/20' : 'hover:bg-brand/10'}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    )}
  </span>
);

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4';

export const CatalogPage: React.FC<CatalogPageProps> = ({ mode = 'all' }) => {
  const { id } = useParams();
  const routeCategory = id ? Number(id) : undefined;
  const { filters, params, set, clear, activeCount } = useCatalogFilters(mode, routeCategory);
  const { data: categories = [] } = useCategories();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.catalog.list(params),
    queryFn: ({ signal }) => catalogApi.getProducts(params, signal),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.totalRegistros ?? 0;
  const category = categories.find(c => c.IDCategoria === filters.categoria);
  const term = filters.q.trim();
  const otherFilters = activeCount - (filters.q ? 1 : 0);
  const loaded = !query.isLoading && !query.isPlaceholderData && !query.isError;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filters.pagina]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
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
          : term
            ? `Resultados para “${term}”`
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

  const popular = [...categories]
    .filter(c => c.Activo !== false && (c.TotalProductos ?? 1) > 0)
    .sort((a, b) => (b.TotalProductos ?? 0) - (a.TotalProductos ?? 0))
    .slice(0, 6);

  const recommendationFilters = {
    q: params.q ?? '', idCategoria: params.idCategoria, precioMin: params.precioMin, precioMax: params.precioMax, soloOfertas: params.soloOfertas,
  };

  return (
    <div className="animate-fade-up overflow-x-hidden">
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
          {mode === 'ofertas' && (
            <div className="mb-8"><RecommendationRail placement="ofertas" title="Ofertas para ti" subtitle="Descuentos seleccionados según tus intereses."
              filters={{ idCategoria: params.idCategoria, precioMin: params.precioMin, precioMax: params.precioMax, q: params.q }} /></div>
          )}
          {!(mode === 'categoria' && category) && (
            <div className="mb-4">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex min-h-9 flex-wrap items-center gap-2">
              <div className="text-sm text-slate-500" aria-live="polite">
                {query.isLoading ? <Skeleton variant="text" className="inline-block h-4 w-24 align-middle" /> : <><strong className="text-slate-900">{total}</strong> {total === 1 ? 'producto' : 'productos'}</>}
              </div>
              {term && mode !== 'categoria' && <Chip tone="query" label={`“${term}”`} onRemove={() => set({ q: undefined })} />}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtros{activeCount > 0 && ` (${activeCount})`}
              </button>
              <label className="relative flex items-center gap-2 text-sm">
                <span className="sr-only sm:not-sr-only text-slate-500">Ordenar</span>
                <select
                  value={filters.orden}
                  onChange={e => set({ orden: e.target.value as CatalogOrder })}
                  className="h-10 appearance-none rounded-full border border-slate-300 bg-white pl-4 pr-9 text-sm font-bold text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {ORDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-500" aria-hidden="true" />
              </label>
            </div>
          </div>

          {otherFilters > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filtros activos">
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
              <button type="button" onClick={clear} className="px-1 text-xs font-bold text-brand hover:underline">Limpiar todo</button>
            </div>
          )}

          {query.isError && !query.data ? (
            <ErrorState
              title="Error al cargar productos"
              onRetry={() => query.refetch()}
            />
          ) : query.isLoading ? (
            <div className={GRID} aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeletonV2 key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div>
              <div className="flex flex-col items-center rounded-3xl bg-canvas px-6 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand shadow-card">
                  <SearchX className="h-8 w-8" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-slate-900">
                  {term ? `No encontramos “${term}”` : 'Sin resultados'}
                </h2>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {otherFilters > 0
                    ? 'Prueba quitando algún filtro o buscando una palabra más general.'
                    : 'Revisa la ortografía o prueba con una palabra más general.'}
                </p>
                {(activeCount > 0 || mode !== 'all') && (
                  <Button variant="cta" size="lg" pill className="mt-5" onClick={clear}>
                    {term && otherFilters === 0 ? 'Ver todo el catálogo' : 'Limpiar filtros'}
                  </Button>
                )}
                {popular.length > 0 && (
                  <div className="mt-8 w-full">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Categorías populares</p>
                    <ul className="flex flex-wrap justify-center gap-2">
                      {popular.map(c => (
                        <li key={c.IDCategoria}>
                          <Link to={`/categoria/${c.IDCategoria}`} className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 transition hover:text-brand hover:ring-brand">
                            {c.Nombre}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {term.length >= 2 && loaded && (
                <SearchRecommendation closest filters={recommendationFilters} />
              )}
            </div>
          ) : (
            <div className={`${GRID} transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
              {items.map(p => <ConnectedProductCard key={p.IDProducto} product={p} />)}
            </div>
          )}

          <NumberedPagination
            className="mt-10"
            page={filters.pagina}
            totalRecords={total}
            pageSize={PAGE_SIZE}
            onPageChange={p => set({ pagina: p }, true)}
          />

          {term.length >= 2 && loaded && items.length > 0 && (
            <SearchRecommendation normalIds={items.map(p => p.IDProducto)} filters={recommendationFilters} />
          )}
        </div>
      </div>

      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <div className="fixed inset-y-0 left-0 z-10 flex w-[88%] max-w-sm flex-col bg-white shadow-lift">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
                <span className="text-base font-extrabold text-slate-900">Filtrar y ordenar</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar filtros"
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{panel}</div>
              <div className="shrink-0 border-t border-slate-200 p-4">
                <Button variant="cta" size="lg" pill block onClick={() => setDrawerOpen(false)}>
                  Ver {total} {total === 1 ? 'producto' : 'productos'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
