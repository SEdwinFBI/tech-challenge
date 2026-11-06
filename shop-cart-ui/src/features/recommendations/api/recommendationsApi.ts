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

export const recommendationsApi = {
  recordView: async (idProducto: number): Promise<void> => {
    await apiClient.post('/recomendaciones/vistas', { idProducto });
  },

  list: async (contexto: RecommendationPlacement, idProducto?: number, filters: RecommendationFilters = {}): Promise<ProductListItem[]> => {
    const res = await apiClient.get<{ items: ProductListItem[] }>('/recomendaciones', { params: { ...filters, contexto, idProducto } });
    return res.data.items;
  },

  search: async (filters: SearchRecommendationFilters, signal?: AbortSignal): Promise<ProductListItem | null> => {
    const res = await apiClient.get<{ item: ProductListItem | null }>('/recomendaciones/busqueda', { params: filters, signal });
    return res.data.item;
  },
};
