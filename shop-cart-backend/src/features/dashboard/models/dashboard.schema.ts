import { z } from 'zod';

export * from './dashboard.model';

const dashboardRangeFields = {
  periodo: z.enum(['HOY', 'SEMANA', 'MES', 'ANIO']).optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
};

const validDateRange = (query: { fechaInicio?: Date; fechaFin?: Date }) =>
  !query.fechaInicio || !query.fechaFin || query.fechaInicio <= query.fechaFin;
const dateRangeError = { message: 'La fecha final debe ser posterior o igual a la inicial.', path: ['fechaFin'] };

export const GetDashboardSummarySchema = z.object({
  ...dashboardRangeFields,
  agrupacion: z.preprocess((v) => (typeof v === 'string' ? v.toUpperCase() : v), z.enum(['DIA', 'SEMANA', 'MES']).optional()),
}).refine(validDateRange, dateRangeError);

export type GetDashboardSummaryDTO = z.infer<typeof GetDashboardSummarySchema>;

export type GetDashboardSummaryQuery = GetDashboardSummaryDTO;

export const GetSalesByPeriodSchema = z.object({
  agrupacion: z.enum(['DIA', 'SEMANA', 'MES']).default('DIA'),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
});

export type GetSalesByPeriodDTO = z.infer<typeof GetSalesByPeriodSchema>;

export type GetSalesByPeriodQuery = GetSalesByPeriodDTO;

export const ExportDashboardExcelSchema = z.object(dashboardRangeFields).refine(validDateRange, dateRangeError);

export type ExportDashboardExcelDTO = z.infer<typeof ExportDashboardExcelSchema>;

export type ExportDashboardExcelQuery = ExportDashboardExcelDTO;
