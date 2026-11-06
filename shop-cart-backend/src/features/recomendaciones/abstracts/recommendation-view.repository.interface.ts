import type { RecommendationOwner } from '../models/recomendaciones.model';

export interface IRecommendationViewRepository {
  recordView(owner: RecommendationOwner, idProducto: number): Promise<void>;
}
