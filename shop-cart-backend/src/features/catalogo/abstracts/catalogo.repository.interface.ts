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
  ProductDetailResult,
  ProductImageDTO,
  SaveCategoryParams,
  SaveCategoryResult,
  UpdateProductParams,
  UpdateProductResult,
  UpdateVariantParams,
  UpdateVariantResult,
} from '../models/catalogo.model';
import type { ReviewCatalogProductQuery } from '../models/catalogo.schema';

export interface ICatalogRepository {
  getCategories(soloActivas: boolean): Promise<CategoryDTO[]>;
  saveCategory(params: SaveCategoryParams): Promise<SaveCategoryResult>;
  getProducts(f: GetProductsFilter): Promise<PaginatedProductsResult>;
  getProductById(idProducto: number): Promise<ProductDetailResult>;
  createProductWithVariant(dto: CreateProductWithVariantParams): Promise<CreateProductResult>;
  updateProduct(dto: UpdateProductParams): Promise<UpdateProductResult>;
  createVariant(dto: CreateVariantParams): Promise<CreateVariantResult>;
  updateVariant(dto: UpdateVariantParams): Promise<UpdateVariantResult>;
  updateVariantPrice(idVariante: number, nuevoPrecio: number, idAdmin: number): Promise<void>;
  deleteOrDeactivateProduct(idProducto: number, idAdmin: number): Promise<DeleteProductResult>;
  getProductImages(idProducto: number): Promise<ProductImageDTO[]>;
  addProductImage(idProducto: number, url: string, idAdmin: number): Promise<ProductImageDTO>;
  deleteProductImage(idProductoImagen: number, idAdmin: number): Promise<string | null>;
  setReferencePrice(idVariante: number, precioReferencia: number | null, idAdmin: number): Promise<void>;
  setFeatured(idProducto: number, destacado: boolean, idAdmin: number): Promise<void>;
  updateCategoryImage(idCategoria: number, imagen: string | null, idAdmin: number): Promise<string | null>;
  applyOffer(idProducto: number, variantes: Array<{ idVariante: number; precioAhora: number }>, idAdmin: number): Promise<void>;
  removeOffer(idProducto: number, idAdmin: number): Promise<void>;
  getProductByIdAdmin(idProducto: number): Promise<ProductDetailResult>;
  getReviewContext(query: ReviewCatalogProductQuery): Promise<CatalogReviewContext>;
}
