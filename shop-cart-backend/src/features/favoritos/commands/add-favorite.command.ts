import { ICommandHandler } from '@/core/cqrs/index';
import { IFavoritesRepository } from '../abstracts/favoritos.repository.interface';
import { AddFavoriteCommand } from '../models/favoritos.schema';
import { FavoritesRepository } from '../repository/favoritos.repository';

export class AddFavoriteCommandHandler implements ICommandHandler<AddFavoriteCommand, void> {
  constructor(private readonly repo: IFavoritesRepository = new FavoritesRepository()) {}

  async handle(cmd: AddFavoriteCommand): Promise<void> {
    await this.repo.add(cmd.idUsuario, cmd.idProducto);
  }
}
