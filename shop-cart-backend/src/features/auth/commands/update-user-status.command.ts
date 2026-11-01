import { ICommandHandler } from '@/core/cqrs/index';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { UpdateUserStatusCommand } from '../models/auth.schema';

export class UpdateUserStatusCommandHandler implements ICommandHandler<UpdateUserStatusCommand, void> {
  constructor(private readonly repo: IAuthRepository = new AuthRepository()) {}

  async handle(cmd: UpdateUserStatusCommand): Promise<void> {
    await this.repo.updateUserStatus(cmd.idUsuarioObjetivo, cmd.activo, cmd.idAdmin);
  }
}
