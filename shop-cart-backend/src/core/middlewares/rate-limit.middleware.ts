import rateLimit from 'express-rate-limit';
import { env } from '@/core/config/env';

const windowMinutes = Number(env.RATE_LIMIT_AUTH_WINDOW_MS);
const maxRequests = Number(env.RATE_LIMIT_AUTH_MAX);

export const authRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    codigo: 'TOO_MANY_REQUESTS',
    mensaje: `Demasiados intentos. Intenta de nuevo en ${windowMinutes} minutos.`,
  },
});
