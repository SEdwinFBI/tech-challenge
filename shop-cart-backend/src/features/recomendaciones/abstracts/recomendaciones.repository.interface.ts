import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import type {
  GetSearchRecommendationQuery,
  RecommendationContext,
  RecommendationFilters,
  RecommendationOwner,
  RecommendationPlacement,
} from '../models/recomendaciones.schema';

export interface IRecommendationsRepository {
  recordView(owner: RecommendationOwner, idProducto: number): Promise<void>;
  getContext(owner: RecommendationOwner, idProducto?: number, placement?: RecommendationPlacement, filters?: RecommendationFilters): Promise<RecommendationContext>;
  findSearchCandidates(input: GetSearchRecommendationQuery): Promise<ProductDTO[]>;
  purgeViews(): Promise<void>;
}
