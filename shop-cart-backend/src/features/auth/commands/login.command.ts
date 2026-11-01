import bcrypt from 'bcryptjs';
import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { AuthSessionService } from '../domain/auth-session.service';
import { SessionResponse } from '../models/auth.model';
import { LoginDTO } from '../models/auth.schema';
import { AuthTokenService } from '../domain/auth-token.service';
import type { IAuthTokenService } from '../abstracts/auth-token.service.interface';
import type { IAuthSessionService } from '../abstracts/auth-session.service.interface';

export class LoginCommandHandler implements ICommandHandler<LoginDTO, SessionResponse> {
  
 constructor(
    private readonly repo: IAuthRepository = new AuthRepository(),
    tokenService: IAuthTokenService = new AuthTokenService(),
    private readonly sessionService: IAuthSessionService = new AuthSessionService(repo, tokenService),
  ) {}

  async handle(cmd: LoginDTO): Promise<SessionResponse> {
    const user = await this.repo.getByEmail(cmd.correo);
    if (!user || !user.PasswordHash || !(await bcrypt.compare(cmd.password, user.PasswordHash))) {
      throw new DomainError('Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS', 401);
    }
    if (!user.Activo) {
      throw new DomainError('Cuenta desactivada.', 'ACCOUNT_DISABLED', 403);
    }
    if (cmd.tokenInvitado && user.Rol === 'CLIENTE') {
      await this.repo.mergeGuestCart(cmd.tokenInvitado, user.IDUsuario);
    }
    return this.sessionService.buildSession(user);
  }
}
