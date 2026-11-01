export interface CartItemDTO {
  IDCarritoItem: number;
  IDVariante: number;
  IDProducto: number;
  Producto: string;
  ImagenUrl?: string | null;
  SKU: string;
  Talla?: string | null;
  Color?: string | null;
  PrecioUnitario: number;
  Cantidad: number;
  SubtotalLinea: number;
  ExistenciaDisponible: number;
  NombreProducto?: string;
  StockDisponible?: number;
  ImagenURL?: string | null;
}

export interface CartSummaryDTO {
  IDCarrito: number | null;
  CodigoCuponAplicado: string | null;
  Subtotal: number;
  Descuento: number;
  Total: number;
}

export interface CartDetailResult {
  items: CartItemDTO[];
  resumen: CartSummaryDTO;
}

export interface UpsertItemParams {
  idUsuario?: number;
  tokenInvitado?: string;
  idVariante: number;
  cantidad: number;
}
