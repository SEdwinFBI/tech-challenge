import { apiClient } from '@/shared/lib/apiClient';
import type { ProductListItem } from '@/shared/types/domain';
import type { RecommendationFilters, RecommendationPlacement, SearchRecommendationFilters } from '../models/recommendations';

export const recommendationsApi = {
  async recordView(idProducto: number): Promise<boolean> {
    await apiClient.post('/recomendaciones/vistas', { idProducto });
    return true;
  },
  async list(contexto: RecommendationPlacement, idProducto?: number, filters: RecommendationFilters = {}): Promise<ProductListItem[]> {
    const response = await apiClient.get<{ items: ProductListItem[] }>('/recomendaciones', { params: { ...filters, contexto, idProducto } });
    return response.data.items;
  },
  async search(filters: SearchRecommendationFilters, signal?: AbortSignal): Promise<ProductListItem | null> {
    const response = await apiClient.get<{ item: ProductListItem | null }>('/recomendaciones/busqueda', { params: filters, signal });
    return response.data.item;
  },
};
