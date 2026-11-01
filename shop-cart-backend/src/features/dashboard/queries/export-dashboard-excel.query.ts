import ExcelJS from 'exceljs';
import { IQueryHandler } from '@/core/cqrs/index';
import { DashboardRepository } from '../repository/dashboard.repository';
import { IDashboardRepository } from '../abstracts/dashboard.repository.interface';
import { ExportDashboardExcelQuery } from '../models/dashboard.schema';

export class ExportDashboardExcelQueryHandler implements IQueryHandler<ExportDashboardExcelQuery, ExcelJS.Workbook> {
  constructor(private readonly repo: IDashboardRepository = new DashboardRepository()) {}

  async handle(query: ExportDashboardExcelQuery): Promise<ExcelJS.Workbook> {
    const fechaInicio = query.fechaInicio || new Date(Date.now() - 30 * 86400 * 1000);
    const fechaFin = query.fechaFin || new Date();

    const resumen = await this.repo.getMetricsSummary(fechaInicio, fechaFin);
    const wb = new ExcelJS.Workbook();

    const wsCat = wb.addWorksheet('Ventas por Categoría');
    wsCat.columns = [
      { header: 'ID', key: 'IDCategoria', width: 10 },
      { header: 'Categoría', key: 'Categoria', width: 28 },
      { header: 'Pedidos', key: 'TotalPedidosCompletados', width: 15 },
      { header: 'Unidades Netas', key: 'UnidadesNetasVendidas', width: 18 },
      { header: 'Ventas Netas (GTQ)', key: 'VentasNetasQuetzales', width: 22 },
    ];
    wsCat.addRows(resumen.ventasPorCategoria);
    wsCat.getColumn('VentasNetasQuetzales').numFmt = '"Q"#,##0.00';

    const wsTop = wb.addWorksheet('Top 10 Productos');
    wsTop.columns = [
      { header: 'ID', key: 'IDProducto', width: 10 },
      { header: 'Producto', key: 'Producto', width: 35 },
      { header: 'Unidades Netas', key: 'UnidadesNetasVendidas', width: 18 },
      { header: 'Ingresos Netos (GTQ)', key: 'IngresosNetosQuetzales', width: 22 },
    ];
    wsTop.addRows(resumen.top10Productos);
    wsTop.getColumn('IngresosNetosQuetzales').numFmt = '"Q"#,##0.00';

    return wb;
  }
}
