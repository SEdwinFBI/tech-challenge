import { ProductCard } from '@/features/catalog/components/ProductCard';
import type { SearchRecommendationFilters } from '../models/recommendations';
import { useSearchRecommendation } from '../hooks/useSearchRecommendation';

interface Props { filters: SearchRecommendationFilters; normalIds: number[] }

export function SearchRecommendation({ filters, normalIds }: Props) {
  const { product } = useSearchRecommendation(filters);
  if (!product || normalIds.includes(product.IDProducto)) return null;
  return <section aria-label="Recomendado por la IA" className="mt-10 border-t border-slate-200 pt-6">
    <h2 className="mb-4 text-lg font-extrabold text-slate-900">Recomendado por la IA</h2>
    <div className="max-w-xs"><ProductCard product={product} /></div>
  </section>;
}
