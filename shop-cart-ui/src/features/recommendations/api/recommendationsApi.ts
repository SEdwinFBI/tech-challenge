import { apiClient } from '@/shared/lib/apiClient';
import type { ProductListItem } from '@/shared/types/domain';

export type RecommendationPlacement = 'producto' | 'carrito' | 'inicio' | 'favoritos' | 'ofertas';

export interface RecommendationFilters {
  idCategoria?: number;
  precioMin?: number;
  precioMax?: number;
  q?: string;
}

export interface SearchRecommendationFilters extends RecommendationFilters {
  q: string;
  soloOfertas?: string;
}

export interface SearchSuggestion {
  product: ProductListItem;
  confianza: 'alta' | 'media' | 'baja';
}

export const recommendationsApi = {
  recordView: async (idProducto: number): Promise<void> => {
    await apiClient.post('/recomendaciones/vistas', { idProducto });
  },

  list: async (contexto: RecommendationPlacement, idProducto?: number, filters: RecommendationFilters = {}): Promise<ProductListItem[]> => {
    const res = await apiClient.get<{ items: ProductListItem[] }>('/recomendaciones', { params: { ...filters, contexto, idProducto } });
    return res.data.items;
  },

  search: async (filters: SearchRecommendationFilters, signal?: AbortSignal): Promise<SearchSuggestion | null> => {
    const q = filters.q.trim().slice(0, 150);
    const res = await apiClient.get<{ item: ProductListItem | null; confianza?: 'alta' | 'media' | 'baja' }>('/recomendaciones/busqueda', { params: { ...filters, q }, signal });
    return res.data.item ? { product: res.data.item, confianza: res.data.confianza ?? 'media' } : null;
  },
};
