export type SalesPeriodGroup = 'DIA' | 'SEMANA' | 'MES';

export interface DashboardKpisDTO {
  TotalPedidosCompletados?: number;
  VentasNetasQuetzales?: number;
  TicketPromedioQuetzales?: number;
  CarritosAbandonadosActuales?: number;
  TotalVentas?: number;
  TotalPedidos?: number;
  TicketPromedio?: number;
  ClientesActivos?: number;
  [key: string]: unknown;
}

export interface TopProductMetricDTO {
  IDProducto: number;
  NombreProducto?: string;
  Producto?: string;
  Nombre?: string;
  UnidadesVendidas?: number;
  UnidadesNetasVendidas?: number;
  IngresosTotales?: number;
  IngresosNetosQuetzales?: number;
  [key: string]: unknown;
}

export interface CategorySalesMetricDTO {
  IDCategoria: number;
  NombreCategoria?: string;
  Categoria?: string;
  TotalVentas?: number;
  Total?: number;
  TotalPedidosCompletados?: number;
  UnidadesNetasVendidas?: number;
  VentasNetasQuetzales?: number;
  Porcentaje?: number;
  [key: string]: unknown;
}

export interface SalesByPeriodItemDTO {
  Periodo: string;
  TotalVentas?: number;
  Ventas?: number;
  CantidadPedidos?: number;
  [key: string]: unknown;
}

export interface DashboardMetricsSummary {
  kpis: DashboardKpisDTO | null;
  top10Productos: TopProductMetricDTO[];
  ventasPorCategoria: CategorySalesMetricDTO[];
}

export interface DashboardSummaryData extends DashboardMetricsSummary {
  serieTemporal: SalesByPeriodItemDTO[];
  generadoEn: string;
}

export type DashboardSummaryResponse = DashboardMetricsSummary & {
  serieTemporal: SalesByPeriodItemDTO[];
  desdeCache: boolean;
  generadoEn: string;
  timestamp?: string;
};
