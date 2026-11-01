import { ICommandHandler } from '@/core/cqrs';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { UpdateUserRoleCommand } from '../models/auth.schema';

export class UpdateUserRoleCommandHandler implements ICommandHandler<UpdateUserRoleCommand, void> {
  constructor(private readonly repo: IAuthRepository = new AuthRepository()) {}

  async handle(cmd: UpdateUserRoleCommand): Promise<void> {
    await this.repo.updateUserRole(cmd.idUsuario, cmd.nuevoRol, cmd.idAdmin);
  }
}
