import { apiClient } from '@/shared/lib/apiClient';
import type { ProductListItem } from '@/shared/types/domain';

export type FavoriteProduct = ProductListItem & { FechaFavorito?: string };

export const favoritesApi = {
  list: async (): Promise<FavoriteProduct[]> => {
    const res = await apiClient.get<{ ok: boolean; datos: FavoriteProduct[] }>('/favoritos');
    return res.data.datos;
  },

  ids: async (): Promise<number[]> => {
    const res = await apiClient.get<{ ok: boolean; datos: number[] }>('/favoritos/ids');
    return res.data.datos;
  },

  add: async (idProducto: number): Promise<void> => {
    await apiClient.post('/favoritos', { idProducto });
  },

  remove: async (idProducto: number): Promise<void> => {
    await apiClient.delete(`/favoritos/${idProducto}`);
  },
};
