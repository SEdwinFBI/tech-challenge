import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '@/core/config/env';
import { AuthRepository } from '@/features/auth/repository/auth.repository';
import { DomainError } from '@/core/domain/domain.error';

export type UserRole = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';

const AuthPayloadSchema = z.object({
  idUsuario: z.number().int().positive(),
  correo: z.string().email(),
  rol: z.enum(['CLIENTE', 'OPERADOR', 'ADMINISTRADOR']),
});

export interface AuthUser {
  idUsuario: number;
  correo: string;
  rol: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const authRepository = new AuthRepository();

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const tokenFromQuery = typeof req.query.token === 'string' ? req.query.token : undefined;

  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (!token) {
    return next(new DomainError('Autenticación requerida.', 'TOKEN_MISSING', 401));
  }
  try {
    if (!env.JWT_ACCESS_SECRET) {
      return next(new DomainError('Token expirado o inválido.', 'TOKEN_EXPIRED', 401));
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    const parsed = AuthPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      return next(new DomainError('Token inválido.', 'TOKEN_PAYLOAD_INVALID', 401));
    }

    const currentUser = await authRepository.getById(parsed.data.idUsuario);
    if (!currentUser || !currentUser.Activo) {
      return next(new DomainError('Usuario inactivo o inexistente.', 'USER_INACTIVE', 403));
    }
    if (currentUser.Rol !== parsed.data.rol || currentUser.Correo !== parsed.data.correo) {
      return next(new DomainError('Los permisos cambiaron. Inicia sesión de nuevo.', 'TOKEN_PERMISSIONS_CHANGED', 401));
    }
    req.user = parsed.data;
    return next();
  } catch (err) {
    if (!(err instanceof jwt.JsonWebTokenError) && !(err instanceof jwt.TokenExpiredError) && !(err instanceof jwt.NotBeforeError)) return next(err);
    return next(new DomainError('Token expirado o inválido.', 'TOKEN_EXPIRED', 401));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const tokenFromQuery = typeof req.query.token === 'string' ? req.query.token : undefined;

  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (token || authHeader !== undefined || tokenFromQuery !== undefined) {
    return requireAuth(req, _res, next);
  }
  return next();
};

export const optionalAuthLenient = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization === undefined && typeof req.query.token !== 'string') return next();
  return requireAuth(req, res, (err?: unknown) => {
    if (err instanceof DomainError && err.httpStatus === 401) {
      req.user = undefined;
      return next();
    }
    return next(err);
  });
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return next(new DomainError('Sin permisos para esta acción.', 'FORBIDDEN_ROLE', 403));
    }
    next();
  };
};
