export type DiscountType = 'PORCENTAJE' | 'MONTO_FIJO';

export interface GetCouponsFilter {
  orden?: string;
  direccion?: string;
  q?: string;
  activo?: boolean;
  vigencia?: 'VIGENTE' | 'VENCIDO' | 'POR_INICIAR';
}

export interface CouponDTO {
  IDCupon: number;
  Codigo: string;
  TipoDescuento: DiscountType;
  Valor: number;
  MontoMinimoCompra: number;
  LimiteTotalUsos: number;
  LimiteUsosPorCliente: number;
  UsosActuales: number;
  IDCategoriaAplica?: number | null;
  FechaInicio: Date | string;
  FechaFin: Date | string;
  Activo: boolean;
  Descripcion?: string;
  ValorDescuento?: number;
  TopeMaximoDescuento?: number | null;
  LimiteUsosTotal?: number | null;
  LimiteUsosPorUsuario?: number | null;
}

export interface SaveCouponParams {
  idCupon?: number;
  codigo: string;
  tipoDescuento: DiscountType;
  valor: number;
  montoMinimoCompra: number;
  limiteTotalUsos: number;
  limiteUsosPorCliente: number;
  idCategoriaAplica?: number | null;
  fechaInicio: Date;
  fechaFin: Date;
  activo: boolean;
  idAdmin: number;
}

export interface ValidateCouponRulesParams {
  tipoDescuento: DiscountType;
  valor: number;
  montoMinimoCompra: number;
  fechaInicio: Date;
  fechaFin: Date;
}

export interface ApplyCouponResult {
  IDCupon?: number;
  Codigo?: string;
  DescuentoAplicado?: number;
  Mensaje?: string;
  [key: string]: unknown;
}

export interface RemoveCouponResult {
  Mensaje?: string;
  [key: string]: unknown;
}

export interface SaveCouponResult {
  IDCupon?: number;
  Mensaje?: string;
  [key: string]: unknown;
}
