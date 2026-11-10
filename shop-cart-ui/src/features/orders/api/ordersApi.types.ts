import type { Order, OrderStatus } from '@/shared/types/domain';

type RawNumeric = number | string | null;

export interface RawOrder {
  IDPedido: number;
  NumeroSeguimiento?: string;
  NumeroPedido?: string;
  Cliente: string;
  Correo: string;
  Estado: OrderStatus;
  Subtotal?: RawNumeric;
  Descuento?: RawNumeric;
  CostoEnvio?: RawNumeric;
  Total?: RawNumeric;
  MontoReembolsado?: RawNumeric;
  BaseImponibleSinIVA?: RawNumeric;
  MontoIVA12?: RawNumeric;
  TotalNetoPagado?: RawNumeric;
  FechaCreacion: string;
  DireccionEntrega?: string;
  TelefonoContacto?: string;
}

export interface RawOrderDetailHeader extends RawOrder {
  DireccionExacta?: string;
  Municipio?: string;
  Departamento?: string;
}

export interface RawOrderLine {
  IDPedidoDetalle?: number;
  IDDetallePedido?: number;
  IDDetalle?: number;
  IDVariante: number;
  SKU?: string;
  Producto?: string;
  NombreProducto?: string;
  Color?: string;
  Talla?: string;
  CantidadComprada?: number;
  Cantidad?: number;
  PrecioUnitarioCongelado?: number;
  PrecioUnitario?: number;
  SubtotalLinea?: number;
  Subtotal?: number;
  CantidadDevuelta?: number;
}

export interface RawOrderHistoryEntry {
  IDPedidoHistorial?: number;
  IDHistorial?: number;
  EstadoAnterior?: string | null;
  EstadoNuevo?: string | null;
  FechaCambio?: string;
  Usuario?: string;
  UsuarioResponsable?: string;
  Comentario?: string | null;
  Motivo?: string | null;
}

export interface RawOrdersListResponse {
  ok?: boolean;
  datos?: RawOrder[];
  total?: number;
  pagina?: number;
  tamanoPagina?: number;
}

export interface RawOrderDetailResponse {
  ok?: boolean;
  pedido?: RawOrderDetailHeader;
  detalles?: RawOrderLine[];
  historial?: RawOrderHistoryEntry[];
}

export interface OrderWithNetTotal extends Order {
  TotalNetoPagado: number;
}
