import { Sparkles } from 'lucide-react';
import { ConnectedProductCard } from '@/features/catalog';
import type { SearchRecommendationFilters } from '../api/recommendationsApi';
import { useSearchRecommendation } from '../hooks/useRecommendations';

interface Props {
  filters: SearchRecommendationFilters;
  normalIds?: number[];
  closest?: boolean;
  className?: string;
}

export function SearchRecommendation({ filters, normalIds = [], closest = false, className }: Props) {
  const { product, confianza } = useSearchRecommendation(filters);
  if (!product || (!closest && (normalIds.includes(product.IDProducto) || confianza !== 'alta'))) return null;
  const wrapper = className ?? (closest ? 'mt-8' : 'mt-12 border-t border-slate-200 pt-8');
  return <section aria-label="Recomendado por la IA" className={wrapper}>
    <div className="mb-4 flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          {closest ? `Lo más parecido a “${filters.q.trim()}”` : 'Sugerido para tu búsqueda'}
        </h2>
        {closest && confianza !== 'alta' && <p className="text-sm text-slate-500">No es exacto, pero puede servirte</p>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
      <ConnectedProductCard product={product} />
    </div>
  </section>;
}
