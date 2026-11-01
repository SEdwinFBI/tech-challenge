import { IQueryHandler } from '@/core/cqrs/index';
import { IFavoritesRepository } from '../abstracts/favoritos.repository.interface';
import { FavoriteProductDTO, GetFavoritesQuery } from '../models/favoritos.schema';
import { FavoritesRepository } from '../repository/favoritos.repository';

export class GetFavoritesQueryHandler implements IQueryHandler<GetFavoritesQuery, FavoriteProductDTO[]> {
  constructor(private readonly repo: IFavoritesRepository = new FavoritesRepository()) {}

  async handle(query: GetFavoritesQuery): Promise<FavoriteProductDTO[]> {
    return this.repo.list(query.idUsuario);
  }
}
