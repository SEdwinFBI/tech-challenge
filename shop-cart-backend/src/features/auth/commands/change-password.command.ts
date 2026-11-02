import bcrypt from 'bcryptjs';
import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { ChangePasswordCommand } from '../models/auth.schema';

export class ChangePasswordCommandHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(private readonly repo: IAuthRepository = new AuthRepository()) {}

  async handle(cmd: ChangePasswordCommand): Promise<void> {
    const user = await this.repo.getByEmail(cmd.correo);
    if (!user || user.IDUsuario !== cmd.idUsuario || !user.PasswordHash) {
      throw new DomainError('No se pudo validar la cuenta.', 'ACCOUNT_NOT_VERIFIED', 403);
    }
    const coincide = await bcrypt.compare(cmd.passwordActual, user.PasswordHash);
    if (!coincide) {
      throw new DomainError('La contraseña actual es incorrecta.', 'INVALID_CURRENT_PASSWORD', 400);
    }
    const nuevoHash = await bcrypt.hash(cmd.passwordNueva, 10);
    await this.repo.changePassword(cmd.idUsuario, nuevoHash);
  }
}
