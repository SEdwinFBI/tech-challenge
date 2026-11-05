import { IQueryHandler } from '@/core/cqrs/index';
import { ICache } from '@/core/cache/cache.interface';
import { obtenerCache } from '@/core/cache/cache.factory';
import { DashboardRepository } from '../repository/dashboard.repository';
import { IDashboardRepository } from '../abstracts/dashboard.repository.interface';
import { resolveDashboardRange } from '../domain/dashboard-range';
import {
  DashboardSummaryData,
  DashboardSummaryResponse,
  GetDashboardSummaryQuery,
} from '../models/dashboard.schema';

export class GetDashboardSummaryQueryHandler
  implements IQueryHandler<GetDashboardSummaryQuery, DashboardSummaryResponse>
{
  constructor(
    private readonly repo: IDashboardRepository = new DashboardRepository(),
    private readonly cache: ICache = obtenerCache()
  ) {}

  async handle(query: GetDashboardSummaryQuery): Promise<DashboardSummaryResponse> {
    const { fechaInicio, fechaFin } = resolveDashboardRange(query);
    const agrupacion = (query.agrupacion || 'DIA').toUpperCase();

    const cacheKey = `dash_${fechaInicio.toISOString()}_${fechaFin.toISOString()}_${agrupacion}`;
    const cached = await this.cache.get<DashboardSummaryData>(cacheKey);
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

    await this.cache.set(cacheKey, data, 180);
    return { desdeCache: false, ...data };
  }
}
