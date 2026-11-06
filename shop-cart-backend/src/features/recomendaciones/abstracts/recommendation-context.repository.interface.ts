import type { RecommendationContext, RecommendationFilters, RecommendationOwner, RecommendationPlacement } from '../models/recomendaciones.model';

export interface IRecommendationContextRepository {
  context(owner: RecommendationOwner, idProducto?: number, placement?: RecommendationPlacement, filters?: RecommendationFilters): Promise<RecommendationContext>;
}
