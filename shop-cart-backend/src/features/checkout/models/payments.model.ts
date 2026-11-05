export type EstadoIntentoPago = 'AUTORIZADO' | 'CAPTURADO' | 'RECHAZADO' | 'ANULADO' | 'PENDIENTE_CONCILIACION';

export interface ContextoPago {
  IDPedidoExistente: number | null;
  MontoTotal: number | null;
  EstadoIntentoActivo: EstadoIntentoPago | null;
  ClaveEnUsoPorOtro: boolean;
  ReservaVencida: boolean;
}

export interface RegistrarIntentoParams {
  idUsuario: number;
  clave: string;
  monto: number;
  estado: 'AUTORIZADO' | 'RECHAZADO' | 'PENDIENTE_CONCILIACION';
  referencia: string | null;
  detalle: string | null;
}

export interface ActualizarEstadoOpciones {
  idPedido?: number | null;
  detalle?: string | null;
  monto?: number | null;
}

export interface IntentoPagoDTO {
  IDIntentoPago: number;
  IDUsuario: number;
  Correo: string;
  ClaveIdempotencia: string;
  Monto: number;
  Estado: EstadoIntentoPago;
  ReferenciaPasarela: string | null;
  Detalle: string | null;
  IDPedido: number | null;
  FechaCreacion: Date | string;
  FechaActualizacion: Date | string;
}

export interface IntentoPendienteDTO {
  IDIntentoPago: number;
  IDUsuario: number;
  ClaveIdempotencia: string;
  Monto: number;
  Estado: EstadoIntentoPago;
  ReferenciaPasarela: string | null;
  FechaCreacion: Date | string;
  MinutosAntiguedad: number;
  IDPedidoExistente: number | null;
  TotalPedido: number | null;
}

export interface ListPaymentsParams {
  estado: EstadoIntentoPago | null;
  pagina: number;
  tamanoPagina: number;
  direccion: 'asc' | 'desc';
}

export interface ListPaymentsResult {
  items: IntentoPagoDTO[];
  totalRegistros: number;
}
