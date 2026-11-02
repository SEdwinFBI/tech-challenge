export type OrderStatus =
  | 'PENDIENTE_PAGO'
  | 'PAGADO'
  | 'EN_PREPARACION'
  | 'DESPACHADO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'DEVUELTO'
  | 'DEVUELTO_PARCIAL'
  | 'DEVUELTO_TOTAL';

export interface OrderHeaderDTO {
  IDPedido: number;
  IDUsuario: number;
  Cliente?: string;
  NombreCliente?: string;
  Correo?: string;
  CorreoCliente?: string;
  Estado: OrderStatus;
  EstadoNombre?: string;
  Subtotal?: number;
  Descuento?: number;
  CostoEnvio?: number;
  MontoReembolsado?: number;
  Total?: number;
  TotalNetoPagado?: number;
  BaseImponibleSinIVA?: number;
  MontoIVA12?: number;
  CodigoCupon?: string | null;
  Departamento?: string;
  Municipio?: string;
  DireccionExacta?: string;
  DireccionEnvio?: string;
  FechaCreacion?: Date | string;
  TotalRegistros?: number;
  NumeroPedido?: string;
}

export interface OrderDetailItemDTO {
  IDPedidoDetalle?: number;
  IDDetallePedido?: number;
  IDPedido?: number;
  IDVariante: number;
  SKU?: string;
  Producto?: string;
  NombreProducto?: string;
  Talla?: string | null;
  Color?: string | null;
  CantidadComprada?: number;
  Cantidad?: number;
  CantidadDevuelta?: number;
  PrecioUnitarioCongelado?: number;
  PrecioUnitario?: number;
  DescuentoUnitarioProrrateado?: number;
  PrecioNetoUnitario?: number;
  SubtotalLinea?: number;
}

export interface OrderHistoryEntryDTO {
  IDPedidoHistorial: number;
  IDHistorial?: number;
  IDPedido?: number;
  Usuario?: string;
  EstadoAnterior: OrderStatus | string | null;
  EstadoNuevo: OrderStatus | string;
  Comentario: string | null;
  FechaCambio: Date | string;
  IDUsuarioOperador?: number | null;
}

export interface OrderAggregate {
  pedido: OrderHeaderDTO;
  detalles: OrderDetailItemDTO[];
  historial: OrderHistoryEntryDTO[];
}

export interface GetOrdersParams {
  idUsuarioFiltro: number | null;
  estado: string | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  pagina: number;
  tamanoPagina: number;
  busqueda?: string | null;
}

export interface GetOrdersResult {
  items: OrderHeaderDTO[];
  totalRegistros: number;
}

export interface UpdateOrderStatusParams {
  idPedido: number;
  nuevoEstado: OrderStatus;
  idUsuario: number;
  rolUsuario: string;
  comentario?: string;
}

export interface UpdateOrderStatusResult {
  idPedido: number;
  estado: OrderStatus;
}

export interface ReturnOrderLineParams {
  idPedido: number;
  idPedidoDetalle: number;
  cantidadADevolver: number;
  motivo: string;
  idOperador: number;
}

export interface ReturnOrderLineResult {
  ok: boolean;
}
