import {
  DashboardMetricsSummary,
  SalesByPeriodItemDTO,
} from '../models/dashboard.schema';

export interface IDashboardRepository {
  getMetricsSummary(fechaInicio: Date, fechaFin: Date): Promise<DashboardMetricsSummary>;
  getSalesByPeriod(agrupacion: string, fechaInicio: Date, fechaFin: Date): Promise<SalesByPeriodItemDTO[]>;
}
