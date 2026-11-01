export type MovementTypeInput =
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE'
  | 'ENTRADA_COMPRA'
  | 'SALIDA_MERMA'
  | 'AJUSTE_FISICO'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export type KardexMovementType =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_MERMA'
  | 'AJUSTE_FISICO'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export interface NormalizedMovement {
  tipoMovimiento: KardexMovementType;
  cantidad: number;
}

export interface CreateMovementParams {
  idVariante: number;
  idUsuario?: number;
  idUsuarioOperador?: number;
  tipoMovimiento: KardexMovementType;
  cantidad: number;
  motivo: string;
  costoUnitario?: number;
}

export interface CreateMovementResult {
  IDMovimiento?: number;
  StockResultante?: number;
  ExistenciaFisicaActualizada?: number;
  Mensaje?: string;
  [key: string]: unknown;
}

export interface KardexItemDTO {
  IDMovimiento?: number;
  IDKardex?: number;
  IDVariante: number;
  SKU: string;
  NombreProducto?: string;
  Producto?: string;
  TipoMovimiento: string;
  Cantidad: number;
  StockAnterior?: number;
  StockResultante?: number;
  SaldoPosterior?: number;
  CostoUnitario?: number | null;
  Motivo: string;
  IDPedidoReferencia?: number | null;
  FechaMovimiento: Date | string;
  UsuarioOperador?: string;
  UsuarioEjecutor?: string;
  TotalRegistros?: number;
}

export interface KardexResult {
  items: KardexItemDTO[];
  totalRegistros: number;
}
