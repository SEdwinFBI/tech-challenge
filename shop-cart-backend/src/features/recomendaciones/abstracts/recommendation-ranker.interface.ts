import type { RecommendationContext, RecommendationPlacement } from '../models/recomendaciones.model';

export interface IRecommendationRanker {
  rank(context: RecommendationContext, placement: RecommendationPlacement): Promise<number[] | null>;
}
