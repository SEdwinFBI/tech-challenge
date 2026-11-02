import { z } from 'zod';

export * from './favoritos.model';

export const AddFavoriteSchema = z.object({
  idProducto: z.number().int().positive(),
});
export type AddFavoriteDTO = z.infer<typeof AddFavoriteSchema>;

export interface AddFavoriteCommand {
  idUsuario: number;
  idProducto: number;
}

export interface RemoveFavoriteCommand {
  idUsuario: number;
  idProducto: number;
}

export interface GetFavoritesQuery {
  idUsuario: number;
}
