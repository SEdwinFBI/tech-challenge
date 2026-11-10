import { apiClient } from '@/shared/lib/apiClient';
import { KardexItem, LowStockItem } from '@/shared/types/domain';
import type {
  KardexQueryParams,
  RawCreateMovementResponse,
  RawKardexItem,
  RawKardexResponse,
} from './inventoryApi.types';

export type KardexSortColumn = 'fecha' | 'cantidad' | 'tipo';
export type LowStockSortColumn = 'existencia' | 'producto' | 'sku';

export interface GetKardexParams {
  orden?: KardexSortColumn;
  direccion?: 'asc' | 'desc';
  pagina?: number;
  tamanoPagina?: number;
  idVariante?: number;
  sku?: string;
  tipoMovimiento?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface KardexResponse {
  ok: boolean;
  movimientos: KardexItem[];
  totalRegistros: number;
  pagina: number;
  tamanoPagina: number;
}

export interface CreateMovementPayload {
  idVariante: number;
  tipoMovimiento: 'ENTRADA_COMPRA' | 'AJUSTE' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  cantidad: number;
  motivo: string;
}

export const inventoryApi = {
  getKardex: async (params?: GetKardexParams): Promise<KardexResponse> => {
    const cleanParams: KardexQueryParams = {
      pagina: params?.pagina || 1,
      tamanoPagina: params?.tamanoPagina || 20,
    };
    if (params?.orden) cleanParams.orden = params.orden;
    if (params?.direccion) cleanParams.direccion = params.direccion;
    if (params?.idVariante) cleanParams.idVariante = params.idVariante;
    if (params?.tipoMovimiento) cleanParams.tipoMovimiento = params.tipoMovimiento;
    if (params?.fechaDesde) cleanParams.fechaDesde = params.fechaDesde;
    if (params?.fechaHasta) cleanParams.fechaHasta = params.fechaHasta;

    const res = await apiClient.get<RawKardexResponse>('/inventario/kardex', { params: cleanParams });
    const raw = res.data;
    const rawItems: RawKardexItem[] = raw.items || raw.movimientos || [];
    const movimientos: KardexItem[] = rawItems.map((k) => ({
      IDKardex: k.IDMovimiento ?? k.IDKardex ?? 0,
      IDVariante: k.IDVariante,
      SKU: k.SKU || '',
      Producto: k.Producto || k.NombreProducto || '',
      TipoMovimiento: k.TipoMovimiento,
      Cantidad: Number(k.Cantidad || 0),
      StockAnterior: Number(k.StockAnterior ?? 0),
      SaldoPosterior: Number(k.StockResultante ?? k.SaldoPosterior ?? 0),
      Motivo: k.Motivo || '',
      UsuarioOperador: k.UsuarioOperador || k.UsuarioEjecutor || 'Sistema',
      UsuarioResponsable: k.UsuarioOperador || k.UsuarioEjecutor || 'Sistema',
      FechaMovimiento: k.FechaMovimiento,
    }));

    return {
      ok: raw.ok ?? true,
      movimientos,
      totalRegistros: raw.totalRegistros ?? movimientos.length,
      pagina: raw.pagina ?? cleanParams.pagina,
      tamanoPagina: raw.tamanoPagina ?? cleanParams.tamanoPagina,
    };
  },

  createMovement: async (data: CreateMovementPayload): Promise<{ ok: boolean; idKardex: number; saldoPosterior: number }> => {
    const res = await apiClient.post<RawCreateMovementResponse>('/inventario/movimientos', data);
    const raw = res.data;
    return {
      ok: raw.ok ?? true,
      idKardex: raw.IDMovimiento ?? raw.idKardex ?? 0,
      saldoPosterior: raw.ExistenciaFisicaActualizada ?? raw.StockResultante ?? raw.saldoPosterior ?? 0,
    };
  },

  getLowStock: async (params?: { q?: string; orden?: LowStockSortColumn; direccion?: 'asc' | 'desc'; pagina?: number; tamanoPagina?: number }): Promise<{
    items: LowStockItem[];
    totalRegistros: number;
    pagina: number;
    tamanoPagina: number;
  }> => {
    const res = await apiClient.get<{ ok: boolean; items: LowStockItem[]; totalRegistros: number; pagina: number; tamanoPagina: number }>(
      '/inventario/existencias-bajas',
      { params: { q: params?.q || undefined, orden: params?.orden, direccion: params?.direccion, pagina: params?.pagina ?? 1, tamanoPagina: params?.tamanoPagina ?? 20 } },
    );
    return res.data;
  },
};
