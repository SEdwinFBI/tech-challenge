import { ICommandHandler } from '@/core/cqrs/index';
import { IFavoritesRepository } from '../abstracts/favoritos.repository.interface';
import { RemoveFavoriteCommand } from '../models/favoritos.schema';
import { FavoritesRepository } from '../repository/favoritos.repository';

export class RemoveFavoriteCommandHandler implements ICommandHandler<RemoveFavoriteCommand, void> {
  constructor(private readonly repo: IFavoritesRepository = new FavoritesRepository()) {}

  async handle(cmd: RemoveFavoriteCommand): Promise<void> {
    await this.repo.remove(cmd.idUsuario, cmd.idProducto);
  }
}
