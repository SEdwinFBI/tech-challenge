import { getDbPool, sql } from '@/core/config/db';
import { IMetrics, obtenerMetrics } from '@/core/observability/metrics';
import { IPaymentsRepository } from '../abstracts/payments.repository.interface';
import {
  ActualizarEstadoOpciones,
  ContextoPago,
  EstadoIntentoPago,
  IntentoPagoDTO,
  IntentoPendienteDTO,
  ListPaymentsParams,
  ListPaymentsResult,
  RegistrarIntentoParams,
} from '../models/payments.model';

export class PaymentsRepository implements IPaymentsRepository {
  constructor(private readonly metrics: IMetrics = obtenerMetrics()) {}

  async obtenerContexto(idUsuario: number, idCarrito: number, idDireccion: number, clave: string): Promise<ContextoPago> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('IDCarrito', sql.Int, idCarrito)
      .input('IDDireccion', sql.Int, idDireccion)
      .input('ClaveIdempotencia', sql.NVarChar(100), clave)
      .execute<ContextoPago>('SP_Pagos_ObtenerContexto');
    return res.recordset[0] as ContextoPago;
  }

  async registrarIntento(params: RegistrarIntentoParams): Promise<number> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, params.idUsuario)
      .input('ClaveIdempotencia', sql.NVarChar(100), params.clave)
      .input('Monto', sql.Decimal(12, 2), params.monto)
      .input('Estado', sql.NVarChar(30), params.estado)
      .input('ReferenciaPasarela', sql.NVarChar(100), params.referencia)
      .input('Detalle', sql.NVarChar(400), params.detalle)
      .execute<{ IDIntentoPago: number }>('SP_Pagos_RegistrarIntento');
    this.metrics.pagoIntento(params.estado);
    return (res.recordset[0] as { IDIntentoPago: number }).IDIntentoPago;
  }

  async actualizarEstado(
    idIntentoPago: number,
    nuevoEstado: EstadoIntentoPago,
    opciones: ActualizarEstadoOpciones = {},
  ): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDIntentoPago', sql.Int, idIntentoPago)
      .input('NuevoEstado', sql.NVarChar(30), nuevoEstado)
      .input('IDPedido', sql.Int, opciones.idPedido ?? null)
      .input('Detalle', sql.NVarChar(400), opciones.detalle ?? null)
      .input('Monto', sql.Decimal(12, 2), opciones.monto ?? null)
      .execute('SP_Pagos_ActualizarEstado');
    this.metrics.pagoIntento(nuevoEstado);
  }

  async listarPendientes(): Promise<IntentoPendienteDTO[]> {
    const pool = await getDbPool();
    const res = await pool.request().execute<IntentoPendienteDTO>('SP_Pagos_ListarPendientes');
    return res.recordset;
  }

  async listar(params: ListPaymentsParams): Promise<ListPaymentsResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Estado', sql.NVarChar(30), params.estado)
      .input('Pagina', sql.Int, params.pagina)
      .input('TamanoPagina', sql.Int, params.tamanoPagina)
      .input('Direccion', sql.VarChar(4), params.direccion)
      .execute<IntentoPagoDTO>('SP_Pagos_Listar');
    const recordsets = res.recordsets as unknown as sql.IRecordSet<{ TotalRegistros: number }>[];
    return { items: res.recordset, totalRegistros: recordsets[1]?.[0]?.TotalRegistros ?? 0 };
  }
}
