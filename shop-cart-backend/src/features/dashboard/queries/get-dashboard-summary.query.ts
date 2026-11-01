import { IQueryHandler } from '@/core/cqrs/index';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { DashboardRepository } from '../repository/dashboard.repository';
import { IDashboardRepository } from '../abstracts/dashboard.repository.interface';
import {
  DashboardSummaryData,
  DashboardSummaryResponse,
  GetDashboardSummaryQuery,
} from '../models/dashboard.schema';

export class GetDashboardSummaryQueryHandler
  implements IQueryHandler<GetDashboardSummaryQuery, DashboardSummaryResponse>
{
  constructor(private readonly repo: IDashboardRepository = new DashboardRepository()) {}

  async handle(query: GetDashboardSummaryQuery): Promise<DashboardSummaryResponse> {
    const fechaInicio = query.fechaInicio || new Date(Date.now() - 30 * 86400 * 1000);
    const fechaFin = query.fechaFin || new Date();
    const agrupacion = (query.agrupacion || 'DIA').toUpperCase();

    const cacheKey = `dash_${fechaInicio.toISOString()}_${fechaFin.toISOString()}_${agrupacion}`;
    const cached = sseCacheManager.get<DashboardSummaryData>(cacheKey);
    if (cached) {
      return { desdeCache: true, ...cached };
    }

    const [resumen, serieTemporal] = await Promise.all([
      this.repo.getMetricsSummary(fechaInicio, fechaFin),
      this.repo.getSalesByPeriod(agrupacion, fechaInicio, fechaFin),
    ]);

    const data: DashboardSummaryData = {
      kpis: resumen.kpis,
      top10Productos: resumen.top10Productos,
      ventasPorCategoria: resumen.ventasPorCategoria,
      serieTemporal,
    };

    sseCacheManager.set(cacheKey, data, 180);
    return { desdeCache: false, ...data };
  }
}
