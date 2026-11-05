import { apiClient } from '@/shared/lib/apiClient';

export interface DashboardKPIs {
  TotalPedidosCompletados: number;
  VentasNetasQuetzales: number;
  TicketPromedioQuetzales: number;
  CarritosAbandonadosActuales: number;
}

export interface TopProduct {
  IDProducto: number;
  Producto: string;
  UnidadesNetasVendidas: number;
  IngresosNetosQuetzales: number;
}

export interface CategorySales {
  IDCategoria: number;
  Categoria: string;
  TotalPedidos: number;
  TotalPedidosCompletados: number;
  UnidadesNetasVendidas: number;
  VentasNetasQuetzales: number;
  MontoBrutoQuetzales: number;
}

export interface TimeSeriesPoint {
  Periodo: string;
  NumeroPedidos: number;
  VentasQuetzales: number;
}

export interface DashboardSummaryResponse {
  ok: boolean;
  desdeCache: boolean;
  kpis: DashboardKPIs;
  top10Productos: TopProduct[];
  ventasPorCategoria: CategorySales[];
  serieTemporal: TimeSeriesPoint[];
}

export const dashboardApi = {
  getSummary: async (params?: { periodo?: 'HOY' | 'SEMANA' | 'MES' | 'ANIO'; fechaInicio?: string; fechaFin?: string }): Promise<DashboardSummaryResponse> => {
    const res = await apiClient.get<DashboardSummaryResponse>('/dashboard/resumen', { params });
    return res.data;
  },

  exportExcel: async (periodo: string = 'MES'): Promise<Blob> => {
    const res = await apiClient.get(`/dashboard/exportar-excel`, {
      params: { periodo },
      responseType: 'blob',
    });
    return res.data;
  },
};
