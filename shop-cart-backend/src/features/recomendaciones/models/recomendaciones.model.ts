import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';

export interface PreferenceSignal {
  IDProducto: number;
  IDCategoria: number;
  Nombre: string;
  Descripcion?: string | null;
  Categoria: string;
  Tipo: 'VISTA' | 'FAVORITO' | 'CARRITO' | 'COMPRA';
  Peso: number;
  PrecioMinimo?: number | null;
}

export interface RecommendationContext {
  signals: PreferenceSignal[];
  candidates: ProductDTO[];
}

export interface RecommendationResult {
  items: ProductDTO[];
  origen: 'jev' | 'preferencias';
}

export interface SearchRecommendationResult {
  item: ProductDTO | null;
}

export type RecommendationPlacement = 'producto' | 'carrito' | 'inicio' | 'favoritos' | 'ofertas';

export interface RecommendationFilters {
  idCategoria?: number;
  precioMin?: number;
  precioMax?: number;
  q?: string;
}

export interface RecommendationOwner {
  propietario: string;
  idUsuario?: number;
  tokenInvitado?: string;
}
