import type { RecommendationFilters } from './recomendaciones.model';

export interface SearchRecommendationInput extends RecommendationFilters { q: string; soloOfertas?: boolean }
