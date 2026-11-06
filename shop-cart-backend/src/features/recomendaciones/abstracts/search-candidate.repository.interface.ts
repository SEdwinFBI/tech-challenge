import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import type { SearchRecommendationInput } from '../models/search-recommendation.model';

export interface ISearchCandidateRepository {
  candidates(input: SearchRecommendationInput): Promise<ProductDTO[]>;
}
