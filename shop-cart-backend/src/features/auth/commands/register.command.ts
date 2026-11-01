import bcrypt from 'bcryptjs';
import { ICommandHandler } from '@/core/cqrs/index';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { AuthSessionService } from '../domain/auth-session.service';
import { SessionResponse } from '../models/auth.model';
import { RegisterDTO } from '../models/auth.schema';
import type { IAuthSessionService } from '../abstracts/auth-session.service.interface';
import { AuthTokenService } from '../domain/auth-token.service';
import type { IAuthTokenService } from '../abstracts/auth-token.service.interface';

export class RegisterCommandHandler implements ICommandHandler<RegisterDTO, SessionResponse> {
  constructor(
    private readonly repo: IAuthRepository = new AuthRepository(),
    tokenService: IAuthTokenService = new AuthTokenService(),
    private readonly sessionService: IAuthSessionService = new AuthSessionService(repo, tokenService),
  ) {}

  async handle(cmd: RegisterDTO): Promise<SessionResponse> {
    const hash = await bcrypt.hash(cmd.password, 10);
    const nuevo = await this.repo.registerClient(cmd.correo, hash, cmd.nombreCompleto);
    if (cmd.tokenInvitado) {
      await this.repo.mergeGuestCart(cmd.tokenInvitado, nuevo.IDUsuario);
    }
    return this.sessionService.buildSession(nuevo);
  }
}
