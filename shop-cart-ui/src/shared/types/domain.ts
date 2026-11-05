export type UserRole = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';

export interface User {
  idUsuario: number;
  correo: string;
  nombreCompleto: string;
  rol: UserRole;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface Category {
  IDCategoria: number;
  Nombre: string;
  Descripcion?: string;
  Activo: boolean;
  TotalProductos?: number;
  ImagenUrl?: string | null;
}

export interface Variant {
  IDVariante: number;
  SKU: string;
  Talla: string;
  Color: string;
  Presentacion?: string;
  Precio: number;
  Activo: boolean;
  ExistenciaFisica: number;
  UnidadesReservadas: number;
  ExistenciaDisponible: number;
  PrecioReferencia?: number | null;
}

export interface ProductListItem {
  IDProducto: number;
  Nombre: string;
  Descripcion: string;
  ImagenUrl?: string;
  Activo: boolean;
  IDCategoria: number;
  Categoria: string;
  PrecioMinimo: number;
  PrecioMaximo: number;
  StockTotalDisponible: number;
  FechaCreacion?: string;
  TotalRegistros?: number;
  Destacado?: boolean;
  PrecioOferta?: number | null;
  PrecioReferencia?: number | null;
  PorcentajeDescuento?: number | null;
  UnidadesVendidas?: number;
}

export interface ProductDetail {
  IDProducto: number;
  Nombre: string;
  Descripcion: string;
  ImagenUrl?: string;
  Activo: boolean;
  IDCategoria: number;
  Categoria: string;
  Destacado?: boolean;
}

export interface ProductImage {
  IDProductoImagen: number;
  IDProducto?: number;
  Url: string;
  Orden: number;
}

export interface LowStockItem {
  IDVariante: number;
  SKU: string;
  Talla?: string | null;
  Color?: string | null;
  Presentacion?: string | null;
  IDProducto: number;
  Producto: string;
  IDCategoria: number;
  Categoria: string;
  ExistenciaFisica: number;
  UnidadesReservadas: number;
  ExistenciaDisponible: number;
  UmbralAplicado: number;
}

export interface CartItem {
  IDCarritoItem: number;
  IDVariante: number;
  IDProducto?: number;
  SKU: string;
  Producto: string;
  ImagenUrl?: string;
  Color: string;
  Talla: string;
  PrecioUnitario: number;
  Cantidad: number;
  SubtotalLinea: number;
  ExistenciaDisponible: number;
}

export interface CartSummary {
  IDCarrito: number | null;
  CodigoCuponAplicado?: string | null;
  Subtotal: number;
  Descuento: number;
  Total: number;
  CostoEnvioEstimado?: number;
}

export interface AppliedCoupon {
  idCupon?: number;
  codigo: string;
  tipoDescuento?: 'PORCENTAJE' | 'MONTO_FIJO';
  valor?: number;
}

export interface Cart {
  idCarrito?: number;
  items: CartItem[];
  resumen?: CartSummary;
  subtotal: number;
  descuento: number;
  costoEnvioEstimado: number;
  total: number;
  cupon: AppliedCoupon | null;
}

export type OrderStatus =
  | 'PAGADO'
  | 'EN_PREPARACION'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'DEVUELTO_PARCIAL'
  | 'DEVUELTO_TOTAL';

export interface OrderItem {
  IDDetalle: number;
  IDVariante: number;
  SKU: string;
  Producto: string;
  Color: string;
  Talla: string;
  Cantidad: number;
  PrecioUnitario: number;
  Subtotal: number;
  CantidadDevuelta: number;
}

export interface OrderHistoryEntry {
  IDHistorial: number;
  EstadoAnterior: string;
  EstadoNuevo: string;
  FechaCambio: string;
  UsuarioResponsable?: string;
  Motivo?: string;
}

export interface Order {
  IDPedido: number;
  NumeroSeguimiento: string;
  Cliente: string;
  Correo: string;
  Estado: OrderStatus;
  Subtotal: number;
  Descuento: number;
  CostoEnvio: number;
  Total: number;
  MontoReembolsado: number;
  BaseImponibleSinIVA: number;
  MontoIVA12: number;
  FechaCreacion: string;
  DireccionEntrega?: string;
  TelefonoContacto?: string;
}

export interface Municipality {
  IDMunicipio: number;
  Municipio: string;
  IDDepartamento: number;
  Departamento: string;
  IDTarifaEnvio: number;
  CostoEnvio: number;
  MontoMinimoEnvioGratis: number;
}

export interface Address {
  IDDireccion: number;
  Etiqueta: string;
  Municipio: string;
  Departamento: string;
  DireccionExacta: string;
  TelefonoContacto: string;
  CostoEnvio?: number;
  MontoMinimoEnvioGratis?: number | null;
  IDMunicipio?: number;
  IDDepartamento?: number;
  Predeterminada?: boolean;
}

export interface Coupon {
  IDCupon: number;
  Codigo: string;
  TipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO';
  Valor: number;
  MontoMinimoCompra: number;
  LimiteTotalUsos: number;
  LimiteUsosPorCliente: number;
  UsosActuales: number;
  IDCategoriaAplica: number | null;
  CategoriaAplica?: string;
  FechaInicio: string;
  FechaFin: string;
  Activo: boolean;
}

export interface KardexItem {
  IDKardex: number;
  IDVariante?: number;
  FechaMovimiento: string;
  SKU: string;
  Producto: string;
  TipoMovimiento: string;
  Naturaleza?: number;
  Cantidad: number;
  StockAnterior?: number;
  SaldoPosterior: number;
  Motivo: string;
  UsuarioResponsable?: string;
  UsuarioOperador?: string;
}

export interface BitacoraItem {
  IDBitacora: number;
  FechaHora: string;
  Modulo: string;
  Accion: string;
  Detalle: string;
  Usuario: string;
  ValorAnterior?: string | null;
  ValorNuevo?: string | null;
}
