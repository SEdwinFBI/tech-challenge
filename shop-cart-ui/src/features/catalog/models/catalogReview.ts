export interface ReviewInput { nombre: string; descripcion?: string; idProducto?: number }
export interface ReviewResult {
  categoriaSugerida: { IDCategoria: number; Nombre: string } | null;
  posiblesDuplicados: Array<{ IDProducto: number; Nombre: string; Categoria: string }>;
  evaluacionDisponible: boolean;
}
