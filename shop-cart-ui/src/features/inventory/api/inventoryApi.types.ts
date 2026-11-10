import type { KardexSortColumn } from './inventoryApi';

export interface KardexQueryParams {
  pagina: number;
  tamanoPagina: number;
  orden?: KardexSortColumn;
  direccion?: 'asc' | 'desc';
  idVariante?: number;
  tipoMovimiento?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface RawKardexItem {
  IDMovimiento?: number;
  IDKardex?: number;
  IDVariante?: number;
  SKU?: string;
  Producto?: string;
  NombreProducto?: string;
  TipoMovimiento: string;
  Cantidad?: number | string | null;
  StockAnterior?: number | string | null;
  StockResultante?: number | string | null;
  SaldoPosterior?: number | string | null;
  Motivo?: string;
  UsuarioOperador?: string;
  UsuarioEjecutor?: string;
  FechaMovimiento: string;
}

export interface RawKardexResponse {
  ok?: boolean;
  items?: RawKardexItem[];
  movimientos?: RawKardexItem[];
  totalRegistros?: number;
  pagina?: number;
  tamanoPagina?: number;
}

export interface RawCreateMovementResponse {
  ok?: boolean;
  IDMovimiento?: number;
  idKardex?: number;
  ExistenciaFisicaActualizada?: number;
  StockResultante?: number;
  saldoPosterior?: number;
}
