import type {
  CategorySales,
  DashboardKPIs,
  DashboardSummaryResponse,
  OrderStateCount,
  PaymentStateCount,
  Periodo,
  TimeSeriesPoint,
  TopProduct,
} from '../api/dashboardApi';

export const PERIODOS: Array<{ id: Periodo; label: string }> = [
  { id: 'HOY', label: 'Hoy' },
  { id: 'SEMANA', label: 'Semana' },
  { id: 'MES', label: 'Mes' },
  { id: 'ANIO', label: 'Año' },
];

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type DashboardKpiValues = Required<DashboardKPIs>;

export interface DashboardView {
  kpis: DashboardKpiValues;
  serie: TimeSeriesPoint[];
  categorias: CategorySales[];
  top10: TopProduct[];
  pedidosPorEstado: OrderStateCount[];
  pagosPorEstado: PaymentStateCount[];
  parcial: boolean;
}

export function normalizeSummary(data: DashboardSummaryResponse): DashboardView {
  const k: DashboardKPIs = data.kpis ?? {};
  return {
    kpis: {
      TotalPedidosCompletados: num(k.TotalPedidosCompletados),
      VentasNetasQuetzales: num(k.VentasNetasQuetzales),
      TicketPromedioQuetzales: num(k.TicketPromedioQuetzales),
      CarritosAbandonadosActuales: num(k.CarritosAbandonadosActuales),
      PedidosPorEntregar: num(k.PedidosPorEntregar),
      ClientesNuevos: num(k.ClientesNuevos),
      VariantesExistenciasBajas: num(k.VariantesExistenciasBajas),
      PedidosConCupon: num(k.PedidosConCupon),
      DescuentoCuponesQuetzales: num(k.DescuentoCuponesQuetzales),
      DevolucionesCantidad: num(k.DevolucionesCantidad),
      DevolucionesMontoQuetzales: num(k.DevolucionesMontoQuetzales),
    },
    serie: (data.serieTemporal ?? []).map(p => ({ ...p, NumeroPedidos: num(p.NumeroPedidos), VentasQuetzales: num(p.VentasQuetzales) })),
    categorias: (data.ventasPorCategoria ?? [])
      .map(c => ({
        ...c,
        UnidadesNetasVendidas: num(c.UnidadesNetasVendidas),
        VentasNetasQuetzales: num(c.VentasNetasQuetzales),
      }))
      .sort((a, b) => b.VentasNetasQuetzales - a.VentasNetasQuetzales),
    top10: (data.top10Productos ?? []).map(p => ({
      ...p,
      UnidadesNetasVendidas: num(p.UnidadesNetasVendidas),
      IngresosNetosQuetzales: num(p.IngresosNetosQuetzales),
    })),
    pedidosPorEstado: (data.pedidosPorEstado ?? []).map(e => ({ ...e, TotalPedidos: num(e.TotalPedidos), MontoQuetzales: num(e.MontoQuetzales) })),
    pagosPorEstado: (data.pagosPorEstado ?? []).map(e => ({ ...e, TotalIntentos: num(e.TotalIntentos), MontoQuetzales: num(e.MontoQuetzales) })),
    parcial: !data.kpis || !data.pedidosPorEstado || !data.pagosPorEstado,
  };
}

export function rejectionRate(pagos: PaymentStateCount[]): { rate: number | null; rejected: number; total: number } {
  const total = pagos.reduce((s, p) => s + p.TotalIntentos, 0);
  const rejected = pagos.find(p => p.Estado === 'RECHAZADO')?.TotalIntentos ?? 0;
  return { rate: total > 0 ? (rejected / total) * 100 : null, rejected, total };
}

const percentFormatter = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatPercent = (value: number | null): string => (value === null ? '—' : `${percentFormatter.format(value)} %`);
