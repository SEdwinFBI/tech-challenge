import { apiClient } from '@/shared/lib/apiClient';
import { Coupon } from '@/shared/types/domain';
import type { SortState } from '@/shared/hooks/useSort';

export type CouponSortColumn = 'fecha' | 'codigo' | 'vigencia' | 'usos';
export type CouponValidity = 'VIGENTE' | 'VENCIDO' | 'POR_INICIAR';

export interface CouponFilters {
  q?: string;
  activo?: boolean;
  vigencia?: CouponValidity;
}

export interface CouponPayload {
  codigo: string;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  montoMinimoCompra: number;
  limiteTotalUsos: number;
  limiteUsosPorCliente: number;
  idCategoriaAplica?: number | null;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export const couponsApi = {
  getCoupons: async (sort?: SortState<CouponSortColumn>, filters: CouponFilters = {}): Promise<Coupon[]> => {
    const res = await apiClient.get<{ ok: boolean; datos: Coupon[] }>('/cupones', { params: { ...sort, ...filters } });
    return res.data.datos;
  },

  createCoupon: async (data: CouponPayload): Promise<void> => {
    await apiClient.post('/cupones', data);
  },

  updateCoupon: async (id: number, data: CouponPayload): Promise<void> => {
    await apiClient.put(`/cupones/${id}`, data);
  },
};
