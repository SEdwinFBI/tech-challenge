export interface CatalogReviewInput {
  nombre: string;
  descripcion?: string;
  idProducto?: number;
}

export interface CatalogReviewContext {
  categories: Array<{ IDCategoria: number; Nombre: string; Descripcion?: string | null }>;
  products: Array<{ IDProducto: number; Nombre: string; Descripcion?: string | null; Categoria: string }>;
}

export interface CatalogReviewResult {
  categoriaSugerida: { IDCategoria: number; Nombre: string } | null;
  posiblesDuplicados: Array<{ IDProducto: number; Nombre: string; Categoria: string }>;
  evaluacionDisponible: boolean;
}
