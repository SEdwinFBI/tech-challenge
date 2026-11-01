import { ProductDTO } from '@/features/catalogo/models/catalogo.model';

export interface FavoriteProductDTO extends ProductDTO {
  FechaFavorito: Date | string;
}

export interface FavoriteIdDTO {
  IDProducto: number;
}
