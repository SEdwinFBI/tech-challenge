import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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
  CORS_ALLOW_ORIGIN: z.string(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  CDN_BASE_URL: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  REDIS_URL: z.string().optional().transform((v) => v || undefined),
  INSTANCE_ID: z.string().optional(),
  TYPESAFE_API_KEY: z.string().optional().transform(v => v || undefined),
  JEV_MODEL: z.string().default('jev-latest'),
  JEV_TIMEOUT_MS: z.coerce.number().int().min(100).max(10000).default(2000),
  TRUST_PROXY: z.string().optional()
});

export const env = envSchema.parse(process.env);
