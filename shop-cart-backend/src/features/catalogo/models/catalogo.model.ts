export interface CategoryDTO {
  IDCategoria: number;
  Nombre: string;
  Descripcion?: string | null;
  Activo: boolean;
  ImagenUrl?: string | null;
  TotalProductos?: number;
}

export interface ProductDTO {
  IDProducto: number;
  IDCategoria: number;
  Categoria?: string;
  NombreCategoria?: string;
  Nombre: string;
  Descripcion?: string | null;
  Marca?: string | null;
  ImagenUrl?: string | null;
  ImagenURL?: string | null;
  PrecioMinimo?: number;
  PrecioMaximo?: number;
  PrecioDesde?: number;
  StockTotalDisponible?: number;
  StockTotal?: number;
  FechaCreacion?: Date | string;
  TotalRegistros?: number;
  Activo: boolean;
  Destacado?: boolean;
  PrecioOferta?: number | null;
  PrecioReferencia?: number | null;
  PorcentajeDescuento?: number | null;
  UnidadesVendidas?: number;
}

export interface VariantDTO {
  IDVariante: number;
  IDProducto?: number;
  SKU: string;
  Talla?: string | null;
  Color?: string | null;
  Presentacion?: string | null;
  Precio: number;
  ExistenciaFisica?: number;
  UnidadesReservadas?: number;
  ExistenciaDisponible?: number;
  StockActual?: number;
  PesoGramos?: number | null;
  PrecioReferencia?: number | null;
  Activo: boolean;
}

export interface PaginatedProductsResult {
  items: ProductDTO[];
  totalRegistros: number;
}

export interface ProductDetailResult {
  producto: ProductDTO | null;
  variantes: VariantDTO[];
  imagenes?: ProductImageDTO[];
}

export interface ProductInventoryResult {
  producto: Pick<ProductDTO, 'IDProducto' | 'Nombre' | 'Activo'>;
  variantes: Array<Pick<VariantDTO, 'IDVariante' | 'SKU' | 'Talla' | 'Color' | 'Presentacion' | 'Activo'> & {
    ExistenciaFisica: number;
    UnidadesReservadas: number;
    ExistenciaDisponible: number;
  }>;
}

export interface GetProductsFilter {
  q?: string;
  idCategoria?: number;
  precioMin?: number;
  precioMax?: number;
  soloDisponibles: boolean;
  incluirInactivos: boolean;
  orden: string;
  pagina: number;
  tamanoPagina: number;
  soloOfertas?: boolean;
  soloNuevos?: boolean;
  soloDestacados?: boolean;
  activo?: boolean;
}

export interface SaveCategoryParams {
  idCategoria?: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  idAdmin: number;
}

export interface CreateProductWithVariantParams {
  idCategoria: number;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  sku: string;
  talla?: string;
  color?: string;
  presentacion?: string;
  precio: number;
  precioReferencia?: number;
  existenciaInicial: number;
  idAdmin: number;
}

export interface UpdateProductParams {
  idProducto: number;
  idCategoria?: number;
  nombre?: string;
  descripcion?: string;
  imagenUrl?: string;
  activo?: boolean;
  idAdmin: number;
}

export interface CreateVariantParams {
  idProducto: number;
  sku: string;
  talla?: string;
  color?: string;
  presentacion?: string;
  precio: number;
  existenciaInicial: number;
  idAdmin: number;
}

export interface UpdateVariantParams {
  idVariante: number;
  sku?: string;
  talla?: string;
  color?: string;
  presentacion?: string;
  precio?: number;
  activo?: boolean;
  idAdmin: number;
}

export interface SaveCategoryResult {
  IDCategoria: number;
  Nombre?: string;
  Descripcion?: string | null;
  Activo?: boolean;
  Mensaje?: string;
}

export interface CreateProductResult {
  IDProducto: number;
  IDVariante?: number;
  Mensaje?: string;
}

export interface UpdateProductResult {
  IDProducto?: number;
  ImagenUrl?: string | null;
  Mensaje?: string;
}

export interface DeleteProductResult {
  IDProducto?: number;
  Accion?: string;
  Mensaje?: string;
}

export interface CreateVariantResult {
  IDVariante: number;
  IDProducto?: number;
  Mensaje?: string;
}

export interface UpdateVariantResult {
  IDVariante?: number;
  Mensaje?: string;
}

export interface ProductImageDTO {
  IDProductoImagen: number;
  IDProducto?: number;
  Url: string;
  Orden: number;
}

export interface CatalogReviewContext {
  categories: Array<{ IDCategoria: number; Nombre: string; Descripcion?: string | null }>;
  products: Array<{ IDProducto: number; Nombre: string; Descripcion?: string | null; Categoria: string }>;
}

export interface CatalogReviewScores {
  categories: Map<number, number>;
  products: Map<number, number>;
}

export interface CatalogReviewResult {
  categoriaSugerida: { IDCategoria: number; Nombre: string } | null;
  posiblesDuplicados: Array<{ IDProducto: number; Nombre: string; Categoria: string }>;
  evaluacionDisponible: boolean;
}
