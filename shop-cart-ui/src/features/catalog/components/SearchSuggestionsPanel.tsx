import React from 'react';
import { Clock, CornerDownLeft, LayoutGrid, Search, Sparkles, X } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { Highlight } from '@/shared/ui/Highlight';
import { PriceTag } from '@/shared/ui/PriceTag';
import { SafeImage } from '@/shared/ui/SafeImage';
import { Skeleton } from '@/shared/ui/Skeleton';
import { plural } from '@/shared/lib/formatters';
import { optionDomId } from '../hooks/useSearchSuggestions';
import type { Category, ProductListItem } from '@/shared/types/domain';

export type SearchOption =
  | { key: string; kind: 'product'; product: ProductListItem }
  | { key: string; kind: 'recommendation'; product: ProductListItem }
  | { key: string; kind: 'category'; category: Category }
  | { key: string; kind: 'recent'; term: string }
  | { key: string; kind: 'all'; term: string };

type ProductOption = Extract<SearchOption, { kind: 'product' | 'recommendation' }>;

interface Props {
  listId: string;
  query: string;
  options: SearchOption[];
  activeKey: string | null;
  loading: boolean;
  stale: boolean;
  recommendationLoading: boolean;
  noResults: boolean;
  closest: boolean;
  mediumConfidence: boolean;
  hint: string | null;
  onActivate: (key: string) => void;
  onSelect: (option: SearchOption) => void;
  onRemoveRecent: (term: string) => void;
}

const Heading: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <div id={id} className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</div>
);

const ProductRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-3 py-2" aria-hidden="true">
    <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton variant="text" className="w-3/5" />
      <Skeleton variant="text" className="h-3 w-1/4" />
    </div>
    <Skeleton variant="text" className="h-5 w-12" />
  </div>
);

export const SearchSuggestionsPanel: React.FC<Props> = ({
  listId, query, options, activeKey, loading, stale, recommendationLoading, noResults, closest, mediumConfidence, hint,
  onActivate, onSelect, onRemoveRecent,
}) => {
  const products = options.filter((o): o is ProductOption => o.kind === 'product' || o.kind === 'recommendation');
  const categories = options.filter(o => o.kind === 'category');
  const recents = options.filter(o => o.kind === 'recent');
  const all = options.find(o => o.kind === 'all');
  const hasRecommendation = products.some(o => o.kind === 'recommendation');

  const row = (o: SearchOption, children: React.ReactNode) => {
    const active = o.key === activeKey;
    return (
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- el teclado lo maneja el combobox
      <div
        role="option"
        tabIndex={-1}
        id={optionDomId(listId, o.key)}
        aria-selected={active}
        onMouseMove={() => !active && onActivate(o.key)}
        onClick={() => onSelect(o)}
        className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left ${active ? 'bg-brand-soft' : ''}`}
      >
        {children}
      </div>
    );
  };

  const productRow = (o: ProductOption) => {
    const p = o.product;
    return row(o, <>
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-canvas">
        <SafeImage src={p.ImagenUrl} alt="" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800"><Highlight text={p.Nombre} query={query} /></span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          {o.kind === 'recommendation' && (
            <Badge size="sm" className="gap-1 !border-brand/20 !bg-brand-soft !text-brand">
              <Sparkles className="h-3 w-3" aria-hidden="true" />Sugerido
            </Badge>
          )}
          <span className="truncate">{p.Categoria}</span>
        </span>
      </span>
      <PriceTag amount={p.PrecioOferta ?? p.PrecioMinimo} size="sm" tone={p.PrecioOferta ? 'sale' : 'default'} />
    </>);
  };

  const showProducts = loading || products.length > 0 || recommendationLoading;

  return (
    <div>
      <div role="listbox" id={listId} aria-label="Sugerencias de búsqueda" aria-busy={loading || recommendationLoading}>
        {showProducts && (
          <div role="group" aria-labelledby={`${listId}-h-p`}>
            <Heading id={`${listId}-h-p`}>{closest ? `Lo más parecido a “${query}”` : 'Productos'}</Heading>
            {loading && products.length === 0 ? (
              <><ProductRowSkeleton /><ProductRowSkeleton /><ProductRowSkeleton /></>
            ) : (
              <div className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
                {products.map(o => <React.Fragment key={o.key}>{productRow(o)}</React.Fragment>)}
              </div>
            )}
            {closest && mediumConfidence && <p className="px-4 pb-1 text-xs text-slate-500">No es exacto, pero puede servirte</p>}
            {recommendationLoading && !hasRecommendation && !loading && <ProductRowSkeleton />}
          </div>
        )}

        {categories.length > 0 && (
          <div role="group" aria-labelledby={`${listId}-h-c`}>
            <Heading id={`${listId}-h-c`}>Categorías</Heading>
            {categories.map(o => o.kind === 'category' && (
              <React.Fragment key={o.key}>
                {row(o, <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800"><Highlight text={o.category.Nombre} query={query} /></span>
                    {o.category.TotalProductos != null && <span className="block text-xs text-slate-500">{plural(o.category.TotalProductos, 'producto')}</span>}
                  </span>
                </>)}
              </React.Fragment>
            ))}
          </div>
        )}

        {recents.length > 0 && (
          <div role="group" aria-labelledby={`${listId}-h-r`}>
            <Heading id={`${listId}-h-r`}>Búsquedas recientes</Heading>
            {recents.map(o => o.kind === 'recent' && (
              <div key={o.key} className="flex items-center">
                <div className="min-w-0 flex-1">
                  {row(o, <>
                    <Clock className="mx-3.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700"><Highlight text={o.term} query={query} /></span>
                  </>)}
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => onRemoveRecent(o.term)}
                  aria-label={`Quitar “${o.term}” del historial`}
                  className="mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {all && all.kind === 'all' && (
          <div className="mt-1 border-t border-slate-100">
            {row(all, <>
              <Search className="mx-3.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand">Buscar “{all.term}”</span>
              <CornerDownLeft className="mr-1 hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
            </>)}
          </div>
        )}
      </div>

      {noResults && (
        <div role="status" className="px-4 py-4 text-sm">
          <p className="font-semibold text-slate-800">Sin resultados para “{query}”</p>
          <p className="mt-0.5 text-slate-500">Revisa la ortografía o prueba con una palabra más general.</p>
        </div>
      )}
      {hint && <p role="status" className="px-4 py-4 text-sm text-slate-500">{hint}</p>}
    </div>
  );
};
