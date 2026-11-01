import { getDbPool, sql } from '@/core/config/db';
import { IDashboardRepository } from '../abstracts/dashboard.repository.interface';
import {
  CategorySalesMetricDTO,
  DashboardKpisDTO,
  DashboardMetricsSummary,
  SalesByPeriodItemDTO,
  TopProductMetricDTO,
} from '../models/dashboard.model';

export class DashboardRepository implements IDashboardRepository {
  async getMetricsSummary(fechaInicio: Date, fechaFin: Date): Promise<DashboardMetricsSummary> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('FechaInicio', sql.DateTime2, fechaInicio)
      .input('FechaFin', sql.DateTime2, fechaFin)
      .execute('SP_Dashboard_ResumenMetricas');

    const sets = result.recordsets as [
      sql.IRecordSet<DashboardKpisDTO>?,
      sql.IRecordSet<TopProductMetricDTO>?,
      sql.IRecordSet<CategorySalesMetricDTO>?,
    ];
    return {
      kpis: sets[0]?.[0] || null,
      top10Productos: sets[1] || [],
      ventasPorCategoria: sets[2] || [],
    };
  }

  async getSalesByPeriod(agrupacion: string, fechaInicio: Date, fechaFin: Date): Promise<SalesByPeriodItemDTO[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Agrupacion', sql.VarChar(10), agrupacion)
      .input('FechaInicio', sql.DateTime2, fechaInicio)
      .input('FechaFin', sql.DateTime2, fechaFin)
      .execute<SalesByPeriodItemDTO>('SP_Dashboard_VentasPorPeriodo');

    return result.recordset || [];
  }
}
