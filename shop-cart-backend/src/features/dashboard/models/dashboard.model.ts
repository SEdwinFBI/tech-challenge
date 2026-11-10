export type SalesPeriodGroup = 'DIA' | 'SEMANA' | 'MES';

export interface DashboardKpisDTO {
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
  NumeroPedidos: number;
  VentasQuetzales: number;
  [key: string]: unknown;
}

export interface PedidoPorEstadoDTO {
  Estado: string;
  TotalPedidos: number;
  MontoQuetzales: number;
}

export interface PagoPorEstadoDTO {
  Estado: string;
  TotalIntentos: number;
  MontoQuetzales: number;
}

export interface DashboardMetricsSummary {
  kpis: DashboardKpisDTO | null;
  top10Productos: TopProductMetricDTO[];
  ventasPorCategoria: CategorySalesMetricDTO[];
  pedidosPorEstado: PedidoPorEstadoDTO[];
  pagosPorEstado: PagoPorEstadoDTO[];
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
