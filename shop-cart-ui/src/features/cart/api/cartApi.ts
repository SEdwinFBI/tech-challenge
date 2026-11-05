import { apiClient } from '@/shared/lib/apiClient';
import { Cart, CartItem, CartSummary } from '@/shared/types/domain';

export interface RawBackendCartResponse {
  ok: boolean;
  items: CartItem[];
  resumen: CartSummary;
}

function normalizeCart(data: RawBackendCartResponse): Cart {
  const resumen = data.resumen || {
    IDCarrito: null,
    CodigoCuponAplicado: null,
    Subtotal: 0,
    Descuento: 0,
    Total: 0,
  };

  return {
    idCarrito: resumen.IDCarrito || undefined,
    items: data.items || [],
    resumen,
    subtotal: Number(resumen.Subtotal) || 0,
    descuento: Number(resumen.Descuento) || 0,
    costoEnvioEstimado: 0,
    total: Number(resumen.Total) || 0,
    cupon: resumen.CodigoCuponAplicado
      ? {
          codigo: resumen.CodigoCuponAplicado,
          tipoDescuento: 'PORCENTAJE',
          valor: Number(resumen.Descuento) || 0,
        }
      : null,
  };
}

export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const res = await apiClient.get<RawBackendCartResponse>('/carrito');
    return normalizeCart(res.data);
  },

  upsertItem: async (idVariante: number, cantidad: number): Promise<Cart> => {
    const res = await apiClient.post<RawBackendCartResponse>('/carrito/items', { idVariante, cantidad });
    return normalizeCart(res.data);
  },

  removeItem: async (idVariante: number): Promise<Cart> => {
    const res = await apiClient.delete<RawBackendCartResponse>(`/carrito/items/${idVariante}`);
    return normalizeCart(res.data);
  },

  applyCoupon: async (codigo: string): Promise<Cart> => {
    await apiClient.post('/cupones/aplicar', { codigo });
    return cartApi.getCart();
  },

  removeCoupon: async (): Promise<Cart> => {
    await apiClient.delete('/cupones/aplicar');
    return cartApi.getCart();
  },
};
