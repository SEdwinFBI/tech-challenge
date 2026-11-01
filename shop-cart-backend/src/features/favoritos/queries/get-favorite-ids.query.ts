import { IQueryHandler } from '@/core/cqrs/index';
import { IFavoritesRepository } from '../abstracts/favoritos.repository.interface';
import { GetFavoritesQuery } from '../models/favoritos.schema';
import { FavoritesRepository } from '../repository/favoritos.repository';

export class GetFavoriteIdsQueryHandler implements IQueryHandler<GetFavoritesQuery, number[]> {
  constructor(private readonly repo: IFavoritesRepository = new FavoritesRepository()) {}

  async handle(query: GetFavoritesQuery): Promise<number[]> {
    const rows = await this.repo.listIds(query.idUsuario);
    return rows.map(r => r.IDProducto);
  }
}
