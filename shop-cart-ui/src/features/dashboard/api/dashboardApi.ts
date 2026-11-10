import { apiClient } from '@/shared/lib/apiClient';

export type Periodo = 'HOY' | 'SEMANA' | 'MES' | 'ANIO';

export interface DashboardKPIs {
  TotalPedidosCompletados?: number;
  VentasNetasQuetzales?: number;
  TicketPromedioQuetzales?: number;
  CarritosAbandonadosActuales?: number;
  PedidosPorEntregar?: number;
  ClientesNuevos?: number;
  VariantesExistenciasBajas?: number;
  PedidosConCupon?: number;
  DescuentoCuponesQuetzales?: number;
  DevolucionesCantidad?: number;
  DevolucionesMontoQuetzales?: number;
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

export interface OrderStateCount {
  Estado: string;
  TotalPedidos: number;
  MontoQuetzales: number;
}

export interface PaymentStateCount {
  Estado: string;
  TotalIntentos: number;
  MontoQuetzales: number;
}

export interface DashboardSummaryResponse {
  generadoEn?: string;
  ok: boolean;
  desdeCache?: boolean;
  kpis?: DashboardKPIs | null;
  top10Productos?: TopProduct[];
  ventasPorCategoria?: CategorySales[];
  pedidosPorEstado?: OrderStateCount[];
  pagosPorEstado?: PaymentStateCount[];
  serieTemporal?: TimeSeriesPoint[];
}

export const dashboardApi = {
  getSummary: async (params?: { periodo?: Periodo; fechaInicio?: string; fechaFin?: string }): Promise<DashboardSummaryResponse> => {
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
