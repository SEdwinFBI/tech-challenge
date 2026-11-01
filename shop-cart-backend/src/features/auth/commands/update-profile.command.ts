import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { UserProfileDTO } from '../models/auth.model';
import { UpdateProfileCommand } from '../models/auth.schema';

export class UpdateProfileCommandHandler implements ICommandHandler<UpdateProfileCommand, UserProfileDTO> {
  constructor(private readonly repo: IAuthRepository = new AuthRepository()) {}

  async handle(cmd: UpdateProfileCommand): Promise<UserProfileDTO> {
    const nombre = cmd.nombreCompleto.trim();
    if (nombre.length < 3) {
      throw new DomainError('El nombre debe tener al menos 3 caracteres.', 'INVALID_NAME', 400);
    }
    return this.repo.updateProfile(cmd.idUsuario, nombre);
  }
}
