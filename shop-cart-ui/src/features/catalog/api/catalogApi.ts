import { apiClient } from '@/shared/lib/apiClient';
import { Category, ProductDetail, ProductImage, ProductListItem, Variant } from '@/shared/types/domain';

export interface ReviewInput {
  nombre: string;
  descripcion?: string;
  idProducto?: number;
}

export interface ReviewResult {
  categoriaSugerida: { IDCategoria: number; Nombre: string } | null;
  posiblesDuplicados: Array<{ IDProducto: number; Nombre: string; Categoria: string }>;
  evaluacionDisponible: boolean;
}

export interface GetProductsParams {
  pagina?: number;
  tamanoPagina?: number;
  q?: string;
  idCategoria?: number;
  precioMin?: number;
  precioMax?: number;
  soloDisponibles?: string;
  orden?: 'RECIENTES' | 'PRECIO_ASC' | 'PRECIO_DESC' | 'NOMBRE_ASC' | 'NOMBRE_DESC' | 'MAS_VENDIDOS' | 'DESTACADOS';
  /** Booleanos viajan como texto "true" (igual que soloDisponibles). */
  soloOfertas?: string;
  soloNuevos?: string;
  soloDestacados?: string;
  /** Solo admin: "true" o "false" filtra activos o inactivos. */
  activo?: string;
}

export interface ProductsResponse {
  ok: boolean;
  items: ProductListItem[];
  totalRegistros: number;
  pagina: number;
  tamanoPagina: number;
}

export interface ProductDetailResponse {
  ok: boolean;
  producto: ProductDetail;
  variantes: Variant[];
  imagenes?: ProductImage[];
}

export interface ProductInventoryResponse {
  ok: boolean;
  producto: Pick<ProductDetail, 'IDProducto' | 'Nombre' | 'Activo'>;
  variantes: Array<Pick<Variant, 'IDVariante' | 'SKU' | 'Talla' | 'Color' | 'Presentacion' | 'Activo' | 'ExistenciaFisica' | 'UnidadesReservadas' | 'ExistenciaDisponible'>>;
}

export interface CreateProductPayload {
  idCategoria: number;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  sku: string;
  talla?: string;
  color?: string;
  presentacion?: string;
  precio: number;
  existenciaInicial?: number;
}

export interface ImageUploadSignature {
  urlSubida: string;
  urlPublica: string;
  clave: string;
  expiraEn: string;
  cabeceras?: Record<string, string>;
}

export const catalogApi = {
  requestImageUpload: async (idProducto: number, contentType: string, tamanoBytes: number): Promise<ImageUploadSignature> => {
    const res = await apiClient.post<{ ok: boolean; datos?: ImageUploadSignature } & Partial<ImageUploadSignature>>(
      `/catalogo/productos/${idProducto}/imagenes/firma`,
      { contentType, tamanoBytes },
    );
    return (res.data.datos ?? res.data) as ImageUploadSignature;
  },

  getProductInventory: async (id: number): Promise<ProductInventoryResponse> => {
    const res = await apiClient.get<ProductInventoryResponse>(`/catalogo/productos/${id}/inventario`);
    return res.data;
  },
  getCategories: async (): Promise<Category[]> => {
    const res = await apiClient.get<{ ok: boolean; datos: Category[] }>('/catalogo/categorias');
    return res.data.datos;
  },

  getProducts: async (params: GetProductsParams, signal?: AbortSignal): Promise<ProductsResponse> => {
    const res = await apiClient.get<ProductsResponse>('/catalogo/productos', { params, signal });
    return res.data;
  },

  getProductById: async (id: number): Promise<ProductDetailResponse> => {
    const res = await apiClient.get<ProductDetailResponse>(`/catalogo/productos/${id}`);
    return res.data;
  },

  saveCategory: async (data: { nombre: string; descripcion?: string; activa?: boolean }): Promise<void> => {
    await apiClient.post('/catalogo/categorias', data);
  },

  updateCategory: async (id: number, data: { nombre: string; descripcion?: string; activa?: boolean }): Promise<void> => {
    await apiClient.put(`/catalogo/categorias/${id}`, data);
  },

  createProduct: async (data: CreateProductPayload): Promise<{ IDProducto?: number }> => {
    const res = await apiClient.post<{ IDProducto?: number }>('/catalogo/productos', data);
    return res.data;
  },

  updateProduct: async (id: number, data: {
    idCategoria?: number;
    nombre?: string;
    descripcion?: string;
    imagenUrl?: string;
    imagenClave?: string;
    activo?: boolean;
  }): Promise<void> => {
    await apiClient.put(`/catalogo/productos/${id}`, data);
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/catalogo/productos/${id}`);
  },

  createVariant: async (idProducto: number, data: {
    sku: string;
    color?: string;
    talla?: string;
    presentacion?: string;
    precio: number;
    existenciaInicial?: number;
  }): Promise<void> => {
    await apiClient.post(`/catalogo/productos/${idProducto}/variantes`, data);
  },

  updateVariant: async (idVariante: number, data: {
    color?: string;
    talla?: string;
    presentacion?: string;
    precio?: number;
    activo?: boolean;
  }): Promise<void> => {
    await apiClient.patch(`/catalogo/variantes/${idVariante}`, data);
  },

  updatePrice: async (idVariante: number, nuevoPrecio: number): Promise<void> => {
    await apiClient.patch(`/catalogo/variantes/${idVariante}/precio`, { nuevoPrecio });
  },

  addProductImage: async (idProducto: number, source: { clave: string } | { url: string }): Promise<ProductImage> => {
    const res = await apiClient.post<{ ok: boolean; datos: ProductImage }>(`/catalogo/productos/${idProducto}/imagenes`, source);
    return res.data.datos;
  },

  deleteProductImage: async (idProductoImagen: number): Promise<void> => {
    await apiClient.delete(`/catalogo/imagenes/${idProductoImagen}`);
  },

  setReferencePrice: async (idVariante: number, precioReferencia: number | null): Promise<void> => {
    await apiClient.patch(`/catalogo/variantes/${idVariante}/precio-referencia`, { precioReferencia });
  },

  setFeatured: async (idProducto: number, destacado: boolean): Promise<void> => {
    await apiClient.patch(`/catalogo/productos/${idProducto}/destacado`, { destacado });
  },

  setCategoryImage: async (idCategoria: number, imagenUrl: string | null): Promise<void> => {
    await apiClient.patch(`/catalogo/categorias/${idCategoria}/imagen`, { imagenUrl });
  },

  review: async (body: ReviewInput): Promise<ReviewResult> => {
    const res = await apiClient.post<ReviewResult>('/catalogo/revision', body);
    return res.data;
  },

  /** Admin: incluye productos y variantes inactivos. */
  getProductAdmin: async (id: number): Promise<ProductDetailResponse> => {
    const res = await apiClient.get<ProductDetailResponse>(`/catalogo/admin/productos/${id}`);
    return res.data;
  },

};
