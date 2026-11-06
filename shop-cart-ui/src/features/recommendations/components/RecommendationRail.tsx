import { ProductRail } from '@/shared/ui/ProductRail';
import { useRecommendations } from '../hooks/useRecommendations';
import type { RecommendationFilters, RecommendationPlacement } from '../api/recommendationsApi';

interface Props {
  placement: RecommendationPlacement;
  title: string;
  subtitle?: string;
  filters?: RecommendationFilters;
}

export function RecommendationRail({ placement, title, subtitle, filters }: Props) {
  const query = useRecommendations(placement, undefined, filters);
  if (query.isError) return null;
  return <ProductRail title={title} subtitle={subtitle} products={query.data ?? []} loading={query.isLoading} />;
}
