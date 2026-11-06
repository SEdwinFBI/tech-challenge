import { DomainError } from '@/core/domain/domain.error';
import type { GetDashboardSummaryQuery } from '../models/dashboard.schema';

const GUATEMALA_OFFSET_MS = 6 * 60 * 60 * 1000;

export function resolveDashboardRange(
  query: Pick<GetDashboardSummaryQuery, 'periodo' | 'fechaInicio' | 'fechaFin'>,
  now = new Date(),
): { fechaInicio: Date; fechaFin: Date } {
  const fechaFin = query.fechaFin ? new Date(query.fechaFin) : new Date(Math.floor(now.getTime() / 60000) * 60000);
  let fechaInicio = query.fechaInicio ? new Date(query.fechaInicio) : undefined;

  if (!fechaInicio && query.periodo) {
    const local = new Date(fechaFin.getTime() - GUATEMALA_OFFSET_MS);
    const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
    switch (query.periodo) {
      case 'SEMANA': start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7); break;
      case 'MES': start.setUTCDate(1); break;
      case 'ANIO': start.setUTCMonth(0, 1); break;
    }
    fechaInicio = new Date(start.getTime() + GUATEMALA_OFFSET_MS);
  }

  fechaInicio ??= new Date(fechaFin.getTime() - 30 * 86400 * 1000);
  if (fechaInicio > fechaFin) {
    throw new DomainError('La fecha final debe ser posterior o igual a la inicial.', 'INVALID_DATE_RANGE', 400);
  }
  return { fechaInicio, fechaFin };
}
