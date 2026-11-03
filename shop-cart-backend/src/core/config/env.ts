import { z } from 'zod';


const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(1433),
  DB_NAME: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN_MIN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  JWT_FAMILY_EXPIRES_IN_DAYS: z.coerce.number().default(30),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(15),
  RATE_LIMIT_AUTH_WINDOW_MIN: z.coerce.number().default(15),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).optional(),
  CORS_ALLOW_ORIGIN: z.string()
});

export const env = envSchema.parse(process.env);
