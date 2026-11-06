import { Sparkles } from 'lucide-react';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import type { SearchRecommendationFilters } from '../models/recommendations';
import { useSearchRecommendation } from '../hooks/useSearchRecommendation';

interface Props {
  filters: SearchRecommendationFilters;
  normalIds: number[];
  title?: string;
  className?: string;
}

export function SearchRecommendation({ filters, normalIds, title = 'Sugerido para tu búsqueda', className = 'mt-12 border-t border-slate-200 pt-8' }: Props) {
  const { product } = useSearchRecommendation(filters);
  if (!product || normalIds.includes(product.IDProducto)) return null;
  return <section aria-label="Recomendado por la IA" className={className}>
    <div className="mb-4 flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-brand" aria-hidden="true" />
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
      <ProductCard product={product} />
    </div>
  </section>;
}
