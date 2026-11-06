import { getDbPool, sql } from '@/core/config/db';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import {
  CatalogReviewContext,
  CategoryDTO,
  CreateProductResult,
  CreateProductWithVariantParams,
  CreateVariantParams,
  CreateVariantResult,
  DeleteProductResult,
  GetProductsFilter,
  PaginatedProductsResult,
  ProductDTO,
  ProductDetailResult,
  ProductImageDTO,
  SaveCategoryParams,
  SaveCategoryResult,
  UpdateProductParams,
  UpdateProductResult,
  UpdateVariantParams,
  UpdateVariantResult,
  VariantDTO,
} from '../models/catalogo.model';
import type { ReviewCatalogProductQuery } from '../models/catalogo.schema';

export class CatalogRepository implements ICatalogRepository {
  async getCategories(soloActivas: boolean): Promise<CategoryDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('SoloActivas', sql.Bit, soloActivas ? 1 : 0)
      .execute<CategoryDTO>('SP_Catalogo_ListarCategorias');
    return res.recordset;
  }

  async saveCategory(params: SaveCategoryParams): Promise<SaveCategoryResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDCategoria', sql.Int, params.idCategoria ?? null)
      .input('Nombre', sql.NVarChar(100), params.nombre)
      .input('Descripcion', sql.NVarChar(300), params.descripcion ?? null)
      .input('Activo', sql.Bit, params.activa ? 1 : 0)
      .input('IDUsuarioAdmin', sql.Int, params.idAdmin)
      .execute<SaveCategoryResult>('SP_Catalogo_GestionarCategoria');
    return res.recordset[0] as SaveCategoryResult;
  }

  async getProducts(f: GetProductsFilter): Promise<PaginatedProductsResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Busqueda', sql.NVarChar(150), f.q ?? null)
      .input('IDCategoria', sql.Int, f.idCategoria ?? null)
      .input('PrecioMin', sql.Decimal(12, 2), f.precioMin ?? null)
      .input('PrecioMax', sql.Decimal(12, 2), f.precioMax ?? null)
      .input('SoloDisponibles', sql.Bit, f.soloDisponibles ? 1 : 0)
      .input('IncluirInactivos', sql.Bit, f.incluirInactivos ? 1 : 0)
      .input('OrdenarPor', sql.VarChar(20), f.orden)
      .input('Pagina', sql.Int, f.pagina)
      .input('TamanoPagina', sql.Int, f.tamanoPagina)
      .input('SoloOfertas', sql.Bit, f.soloOfertas ? 1 : 0)
      .input('SoloNuevos', sql.Bit, f.soloNuevos ? 1 : 0)
      .input('SoloDestacados', sql.Bit, f.soloDestacados ? 1 : 0)
      .input('Activo', sql.Bit, f.activo === undefined ? null : f.activo ? 1 : 0)
      .execute<ProductDTO>('SP_Catalogo_ListarProductos');

    return {
      items: res.recordset,
      totalRegistros: (res.recordsets as sql.IRecordSet<{ TotalRegistros: number }>[])[1]?.[0]?.TotalRegistros ?? 0,
    };
  }

  async getProductById(idProducto: number): Promise<ProductDetailResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, idProducto)
      .execute('SP_Catalogo_ObtenerDetalleProducto');

    const sets = res.recordsets as [sql.IRecordSet<ProductDTO>, sql.IRecordSet<VariantDTO>, sql.IRecordSet<ProductImageDTO>];
    return {
      producto: sets[0]?.[0] || null,
      variantes: sets[1] || [],
      imagenes: sets[2] || [],
    };
  }

  async createProductWithVariant(dto: CreateProductWithVariantParams): Promise<CreateProductResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDCategoria', sql.Int, dto.idCategoria)
      .input('Nombre', sql.NVarChar(150), dto.nombre)
      .input('Descripcion', sql.NVarChar(1000), dto.descripcion ?? null)
      .input('ImagenURL', sql.NVarChar(500), dto.imagenUrl ?? null)
      .input('SKU', sql.NVarChar(50), dto.sku)
      .input('Talla', sql.VarChar(30), dto.talla ?? null)
      .input('Color', sql.VarChar(50), dto.color ?? null)
      .input('Presentacion', sql.NVarChar(50), dto.presentacion ?? null)
      .input('Precio', sql.Decimal(12, 2), dto.precio)
      .input('ExistenciaInicial', sql.Int, dto.existenciaInicial)
      .input('IDUsuarioAdmin', sql.Int, dto.idAdmin)
      .execute<CreateProductResult>('SP_Catalogo_CrearProductoConVariante');
    return res.recordset[0] as CreateProductResult;
  }

  async updateProduct(dto: UpdateProductParams): Promise<UpdateProductResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, dto.idProducto)
      .input('IDCategoria', sql.Int, dto.idCategoria ?? null)
      .input('Nombre', sql.NVarChar(150), dto.nombre ?? null)
      .input('Descripcion', sql.NVarChar(1000), dto.descripcion ?? null)
      .input('ImagenURL', sql.NVarChar(500), dto.imagenUrl ?? null)
      .input('Activo', sql.Bit, dto.activo !== undefined ? (dto.activo ? 1 : 0) : null)
      .input('IDUsuarioAdmin', sql.Int, dto.idAdmin)
      .execute<UpdateProductResult>('SP_Catalogo_ActualizarProducto');
    return res.recordset[0] as UpdateProductResult;
  }

  async createVariant(dto: CreateVariantParams): Promise<CreateVariantResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, dto.idProducto)
      .input('SKU', sql.NVarChar(50), dto.sku)
      .input('Talla', sql.VarChar(30), dto.talla ?? null)
      .input('Color', sql.VarChar(50), dto.color ?? null)
      .input('Presentacion', sql.NVarChar(50), dto.presentacion ?? null)
      .input('Precio', sql.Decimal(12, 2), dto.precio)
      .input('ExistenciaInicial', sql.Int, dto.existenciaInicial)
      .input('IDUsuarioAdmin', sql.Int, dto.idAdmin)
      .execute<CreateVariantResult>('SP_Catalogo_CrearVariante');
    return res.recordset[0] as CreateVariantResult;
  }

  async updateVariant(dto: UpdateVariantParams): Promise<UpdateVariantResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDVariante', sql.Int, dto.idVariante)
      .input('SKU', sql.NVarChar(50), dto.sku ?? null)
      .input('Talla', sql.VarChar(30), dto.talla ?? null)
      .input('Color', sql.VarChar(50), dto.color ?? null)
      .input('Presentacion', sql.NVarChar(50), dto.presentacion ?? null)
      .input('Precio', sql.Decimal(12, 2), dto.precio ?? null)
      .input('Activo', sql.Bit, dto.activo !== undefined ? (dto.activo ? 1 : 0) : null)
      .input('IDUsuarioAdmin', sql.Int, dto.idAdmin)
      .execute<UpdateVariantResult>('SP_Catalogo_ActualizarVariante');
    return res.recordset[0] as UpdateVariantResult;
  }

  async updateVariantPrice(idVariante: number, nuevoPrecio: number, idAdmin: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDVariante', sql.Int, idVariante)
      .input('NuevoPrecio', sql.Decimal(12, 2), nuevoPrecio)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute('SP_Catalogo_ActualizarPrecioVariante');
  }

  async deleteOrDeactivateProduct(idProducto: number, idAdmin: number): Promise<DeleteProductResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, idProducto)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute<DeleteProductResult>('SP_Catalogo_EliminarODesactivarProducto');
    return res.recordset[0] as DeleteProductResult;
  }

  async getProductImages(idProducto: number): Promise<ProductImageDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, idProducto)
      .execute<ProductImageDTO>('SP_Catalogo_ListarImagenesProducto');
    return res.recordset;
  }

  async addProductImage(idProducto: number, url: string, idAdmin: number): Promise<ProductImageDTO> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, idProducto)
      .input('Url', sql.NVarChar(500), url)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute<ProductImageDTO>('SP_Catalogo_AgregarImagenProducto');
    return res.recordset[0] as ProductImageDTO;
  }

  async deleteProductImage(idProductoImagen: number, idAdmin: number): Promise<string | null> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProductoImagen', sql.Int, idProductoImagen)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute<{ Url: string }>('SP_Catalogo_EliminarImagenProducto');
    return res.recordset?.[0]?.Url ?? null;
  }

  async setReferencePrice(idVariante: number, precioReferencia: number | null, idAdmin: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDVariante', sql.Int, idVariante)
      .input('PrecioReferencia', sql.Decimal(12, 2), precioReferencia)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute('SP_Catalogo_ActualizarPrecioReferencia');
  }

  async setFeatured(idProducto: number, destacado: boolean, idAdmin: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDProducto', sql.Int, idProducto)
      .input('Destacado', sql.Bit, destacado ? 1 : 0)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute('SP_Catalogo_MarcarDestacado');
  }

  async updateCategoryImage(idCategoria: number, imagenUrl: string | null, idAdmin: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDCategoria', sql.Int, idCategoria)
      .input('ImagenUrl', sql.NVarChar(500), imagenUrl)
      .input('IDUsuarioAdmin', sql.Int, idAdmin)
      .execute('SP_Catalogo_ActualizarImagenCategoria');
  }

  async getProductByIdAdmin(idProducto: number): Promise<ProductDetailResult> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDProducto', sql.Int, idProducto)
      .execute('SP_Catalogo_ObtenerDetalleAdmin');

    const sets = res.recordsets as [sql.IRecordSet<ProductDTO>, sql.IRecordSet<VariantDTO>, sql.IRecordSet<ProductImageDTO>];
    return {
      producto: sets[0]?.[0] || null,
      variantes: sets[1] || [],
      imagenes: sets[2] || [],
    };
  }

  async getReviewContext(query: ReviewCatalogProductQuery): Promise<CatalogReviewContext> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('Nombre', sql.NVarChar(150), query.nombre)
      .input('IDProducto', sql.Int, query.idProducto ?? null)
      .execute('SP_Catalogo_ContextoRevision');
    const sets = res.recordsets as [sql.IRecordSet<CatalogReviewContext['categories'][number]>, sql.IRecordSet<CatalogReviewContext['products'][number]>];
    return { categories: sets[0] ?? [], products: sets[1] ?? [] };
  }
}
