import { getDbPool, sql } from '@/core/config/db';
import { IOrdersRepository } from '../abstracts/pedidos.repository.interface';
import {
  GetOrdersParams,
  GetOrdersResult,
  OrderAggregate,
  OrderDetailItemDTO,
  OrderHeaderDTO,
  OrderHistoryEntryDTO,
  ReturnOrderLineParams,
  UpdateOrderStatusParams,
} from '../models/pedidos.model';

export class OrdersRepository implements IOrdersRepository {
  async getById(idPedido: number): Promise<OrderAggregate | null> {
    const pool = await getDbPool();
    const res = await pool.request().input('IDPedido', sql.Int, idPedido).execute('SP_Pedidos_ObtenerPorID');
    const sets = res.recordsets as [
      sql.IRecordSet<OrderHeaderDTO> | undefined,
      sql.IRecordSet<OrderDetailItemDTO> | undefined,
      sql.IRecordSet<OrderHistoryEntryDTO> | undefined,
    ];
    if (!sets[0]?.[0]) return null;
    return {
      pedido: sets[0][0],
      detalles: sets[1] || [],
      historial: sets[2] || [],
    };
  }

  async getAllPaginated(params: GetOrdersParams): Promise<GetOrdersResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuarioFiltro', sql.Int, params.idUsuarioFiltro)
      .input('Estado', sql.VarChar(30), params.estado)
      .input('FechaInicio', sql.DateTime2, params.fechaInicio)
      .input('FechaFin', sql.DateTime2, params.fechaFin)
      .input('Pagina', sql.Int, params.pagina)
      .input('TamanoPagina', sql.Int, params.tamanoPagina)
      .input('Busqueda', sql.NVarChar(100), params.busqueda ?? null)
      .execute('SP_Pedidos_ListarPaginado');

    const recordset = res.recordset as sql.IRecordSet<OrderHeaderDTO>;
    return {
      items: recordset,
      totalRegistros: (res.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }

  async updateStatus(params: UpdateOrderStatusParams): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDPedido', sql.Int, params.idPedido)
      .input('NuevoEstado', sql.VarChar(30), params.nuevoEstado)
      .input('IDUsuario', sql.Int, params.idUsuario)
      .input('RolUsuario', sql.VarChar(20), params.rolUsuario)
      .input('Comentario', sql.NVarChar(300), params.comentario ?? null)
      .execute('SP_Pedidos_CambiarEstado');
  }

  async processLineReturn(params: ReturnOrderLineParams): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDPedido', sql.Int, params.idPedido)
      .input('IDPedidoDetalle', sql.Int, params.idPedidoDetalle)
      .input('CantidadADevolver', sql.Int, params.cantidadADevolver)
      .input('Motivo', sql.NVarChar(300), params.motivo)
      .input('IDUsuarioOperador', sql.Int, params.idOperador)
      .execute('SP_Pedidos_ProcesarDevolucionLinea');
  }
}
