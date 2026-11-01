import { env } from "@/core/config/env";
import type { UserAccessTokenPayload } from "../models";
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { IAuthTokenService } from "../abstracts/auth-token.service.interface";

export class AuthTokenService implements IAuthTokenService {


    public hashRefreshToken(token: string): string {
        return crypto.createHash('sha256')
            .update(token)
            .digest('hex');
    }

    public generateRefreshToken(): string {
        return crypto.randomBytes(40)
            .toString('hex');
    }

    public signAccessToken(user: UserAccessTokenPayload): string {
        return jwt.sign(
            { idUsuario: user.IDUsuario, correo: user.Correo, rol: user.Rol },
            env.JWT_ACCESS_SECRET,
            { algorithm: 'HS256', expiresIn: env.JWT_ACCESS_EXPIRES_IN_MIN as jwt.SignOptions['expiresIn'] }
        );
    }
}