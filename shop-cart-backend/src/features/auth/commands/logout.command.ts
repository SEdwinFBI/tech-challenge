import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { AuthRepository } from '../repository/auth.repository';
import { AuthTokenService } from '../domain/auth-token.service';
import type { IAuthTokenService } from '../abstracts/auth-token.service.interface';

export class LogoutCommandHandler {
  constructor(
    private readonly repo: IAuthRepository = new AuthRepository(),
    private readonly tokenService: IAuthTokenService = new AuthTokenService(),
  ) {}

  async handle(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    await this.repo.revokeRefreshToken(tokenHash);
  }
}
