import { z } from 'zod';

export * from './dashboard.model';

export const GetDashboardSummarySchema = z.object({
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  agrupacion: z.string().optional(),
});

export type GetDashboardSummaryDTO = z.infer<typeof GetDashboardSummarySchema>;

export type GetDashboardSummaryQuery = GetDashboardSummaryDTO;

export const GetSalesByPeriodSchema = z.object({
  agrupacion: z.enum(['DIA', 'SEMANA', 'MES']).default('DIA'),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
});

export type GetSalesByPeriodDTO = z.infer<typeof GetSalesByPeriodSchema>;

export type GetSalesByPeriodQuery = GetSalesByPeriodDTO;

export const ExportDashboardExcelSchema = z.object({
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
});

export type ExportDashboardExcelDTO = z.infer<typeof ExportDashboardExcelSchema>;

export type ExportDashboardExcelQuery = ExportDashboardExcelDTO;
