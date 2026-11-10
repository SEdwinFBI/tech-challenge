import ExcelJS from 'exceljs';
import { IQueryHandler } from '@/core/cqrs/index';
import { DashboardRepository } from '../repository/dashboard.repository';
import { IDashboardRepository } from '../abstracts/dashboard.repository.interface';
import { ExportDashboardExcelQuery } from '../models/dashboard.schema';
import { resolveDashboardRange } from '../domain/dashboard-range';

export class ExportDashboardExcelQueryHandler implements IQueryHandler<ExportDashboardExcelQuery, ExcelJS.Workbook> {
  constructor(private readonly repo: IDashboardRepository = new DashboardRepository()) {}

  async handle(query: ExportDashboardExcelQuery): Promise<ExcelJS.Workbook> {
    const { fechaInicio, fechaFin } = resolveDashboardRange(query);

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

    const wsKpi = wb.addWorksheet('Indicadores');
    wsKpi.columns = [
      { header: 'Indicador', key: 'indicador', width: 36 },
      { header: 'Valor', key: 'valor', width: 20 },
    ];
    const kpis = resumen.kpis ?? {};
    const num = (value: unknown) => Number(value ?? 0);
    const moneda = '"Q"#,##0.00';
    const indicadores: Array<[string, number, string?]> = [
      ['Pedidos completados', num(kpis.TotalPedidosCompletados)],
      ['Ventas netas (GTQ)', num(kpis.VentasNetasQuetzales), moneda],
      ['Ticket promedio (GTQ)', num(kpis.TicketPromedioQuetzales), moneda],
      ['Carritos abandonados actuales', num(kpis.CarritosAbandonadosActuales)],
      ['Pedidos por entregar', num(kpis.PedidosPorEntregar)],
      ['Clientes nuevos', num(kpis.ClientesNuevos)],
      ['Variantes con existencias bajas', num(kpis.VariantesExistenciasBajas)],
      ['Pedidos con cupón', num(kpis.PedidosConCupon)],
      ['Descuento por cupones (GTQ)', num(kpis.DescuentoCuponesQuetzales), moneda],
      ['Devoluciones (cantidad)', num(kpis.DevolucionesCantidad)],
      ['Devoluciones (GTQ)', num(kpis.DevolucionesMontoQuetzales), moneda],
    ];
    indicadores.forEach(([indicador, valor, formato]) => {
      const row = wsKpi.addRow({ indicador, valor });
      if (formato) row.getCell('valor').numFmt = formato;
    });

    const wsPedidos = wb.addWorksheet('Pedidos por Estado');
    wsPedidos.columns = [
      { header: 'Estado', key: 'Estado', width: 24 },
      { header: 'Pedidos', key: 'TotalPedidos', width: 15 },
      { header: 'Monto (GTQ)', key: 'MontoQuetzales', width: 22 },
    ];
    wsPedidos.addRows(resumen.pedidosPorEstado);
    wsPedidos.getColumn('MontoQuetzales').numFmt = '"Q"#,##0.00';

    const wsPagos = wb.addWorksheet('Pagos por Estado');
    wsPagos.columns = [
      { header: 'Estado', key: 'Estado', width: 24 },
      { header: 'Intentos', key: 'TotalIntentos', width: 15 },
      { header: 'Monto (GTQ)', key: 'MontoQuetzales', width: 22 },
    ];
    wsPagos.addRows(resumen.pagosPorEstado);
    wsPagos.getColumn('MontoQuetzales').numFmt = '"Q"#,##0.00';

    return wb;
  }
}
