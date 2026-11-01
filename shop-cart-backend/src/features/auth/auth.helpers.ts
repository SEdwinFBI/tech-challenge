import { env } from '@/core/config/env';
import {Response} from 'express'

export const setCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.JWT_REFRESH_EXPIRES_IN * 86400 * 1000,
    path: '/api/v1/auth',
  });
};