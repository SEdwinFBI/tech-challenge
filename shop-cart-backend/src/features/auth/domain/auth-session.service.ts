
import { env } from '@/core/config/env';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import {
  SessionResponse,
  UserSessionData,
} from '../models/auth.model';
import type { IAuthSessionService } from '../abstracts/auth-session.service.interface';
import type { IAuthTokenService } from '../abstracts/auth-token.service.interface';

export class AuthSessionService implements IAuthSessionService {
  constructor(
    private readonly repo: IAuthRepository,
    private readonly tokenService: IAuthTokenService,
  ) { }

  public async buildSession(user: UserSessionData, familyExpiresAt?: Date): Promise<SessionResponse> {
    const accessToken = this.tokenService.signAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshHash = this.tokenService.hashRefreshToken(refreshToken);
    const exp = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 86400 * 1000);
    const familyExp = familyExpiresAt ?? new Date(Date.now() + env.JWT_FAMILY_EXPIRES_IN_DAYS * 86400 * 1000);

    await this.repo.saveRefreshToken(user.IDUsuario, refreshHash, exp, familyExp);
    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN_MIN,
      usuario: {
        idUsuario: user.IDUsuario,
        correo: user.Correo,
        nombreCompleto: user.NombreCompleto,
        rol: user.Rol,
      },
    };
  }
}
