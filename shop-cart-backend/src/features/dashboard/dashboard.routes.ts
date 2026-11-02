import { Router } from 'express';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { DomainError } from '@/core/domain/domain.error';
import { consumeStreamTicket, issueStreamTicket } from './domain/stream-ticket.store';
import { GetDashboardSummaryQueryHandler } from './queries/get-dashboard-summary.query';
import { ExportDashboardExcelQueryHandler } from './queries/export-dashboard-excel.query';
import {
  DashboardSummaryResponse,
  ExportDashboardExcelSchema,
  GetDashboardSummarySchema,
} from './models/dashboard.schema';

export const dashboardRouter = Router();
const getDashboardSummaryQueryHandler = new GetDashboardSummaryQueryHandler();
const exportDashboardExcelQueryHandler = new ExportDashboardExcelQueryHandler();

dashboardRouter.get('/resumen', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = GetDashboardSummarySchema.parse(req.query);
    const data: DashboardSummaryResponse = await getDashboardSummaryQueryHandler.handle(query);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.post('/stream-ticket', requireAuth, requireRoles('ADMINISTRADOR'), (_req, res) => {
  res.json({ ok: true, ...issueStreamTicket() });
});

dashboardRouter.get('/stream', (req, res, next) => {
  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
  if (!consumeStreamTicket(ticket)) {
    return next(new DomainError('Ticket de conexión inválido o vencido.', 'STREAM_TICKET_INVALID', 401));
  }
  sseCacheManager.subscribe(res);
});

dashboardRouter.get('/exportar-excel', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = ExportDashboardExcelSchema.parse(req.query);
    const workbook = await exportDashboardExcelQueryHandler.handle(query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});
