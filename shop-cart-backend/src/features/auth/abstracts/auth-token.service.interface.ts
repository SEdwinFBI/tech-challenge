import type { UserAccessTokenPayload } from "../models";

export interface IAuthTokenService {
  hashRefreshToken(token: string): string;
  generateRefreshToken(): string;
  signAccessToken(user: UserAccessTokenPayload): string;
}
    