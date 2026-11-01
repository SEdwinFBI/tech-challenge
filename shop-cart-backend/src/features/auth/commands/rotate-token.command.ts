import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { env } from '@/core/config/env';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { SessionResponse } from '../models/auth.model';
import { RotateTokenCommand } from '../models/auth.schema';
import { AuthTokenService } from '../domain/auth-token.service';
import type { IAuthTokenService } from '../abstracts/auth-token.service.interface';

export class RotateTokenCommandHandler implements ICommandHandler<RotateTokenCommand, SessionResponse> {
  constructor(
    private readonly repo: IAuthRepository = new AuthRepository(),
    private readonly tokenService: IAuthTokenService = new AuthTokenService(),
  ) {}

  async handle(refreshToken: RotateTokenCommand): Promise<SessionResponse> {
    const hashActual = this.tokenService.hashRefreshToken(refreshToken);
    const nuevoPlano = this.tokenService.generateRefreshToken();
    const nuevoHash = this.tokenService.hashRefreshToken(nuevoPlano);
    const nuevaExp = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 86400 * 1000);

    const user = await this.repo.rotateRefreshToken(hashActual, nuevoHash, nuevaExp);
    if (!user) throw new DomainError('Sesión inválida o usuario inactivo.', 'SESSION_INVALID', 401);

    return {
      accessToken: this.tokenService.signAccessToken(user),
      refreshToken: nuevoPlano,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      usuario: {
        idUsuario: user.IDUsuario,
        correo: user.Correo,
        nombreCompleto: user.NombreCompleto,
        rol: user.Rol,
      },
    };
  }
}
