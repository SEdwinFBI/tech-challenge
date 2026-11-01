import { FavoriteIdDTO, FavoriteProductDTO } from '../models/favoritos.model';

export interface IFavoritesRepository {
  list(idUsuario: number): Promise<FavoriteProductDTO[]>;
  listIds(idUsuario: number): Promise<FavoriteIdDTO[]>;
  add(idUsuario: number, idProducto: number): Promise<void>;
  remove(idUsuario: number, idProducto: number): Promise<void>;
}
