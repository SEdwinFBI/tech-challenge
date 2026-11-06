export type RecommendationPlacement = 'producto' | 'carrito' | 'inicio' | 'favoritos' | 'ofertas';
export interface RecommendationFilters { idCategoria?: number; precioMin?: number; precioMax?: number; q?: string }
export interface SearchRecommendationFilters extends RecommendationFilters { q: string; soloOfertas?: string }
