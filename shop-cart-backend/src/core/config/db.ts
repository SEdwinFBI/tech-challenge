import sql from 'mssql';
import { env } from './env';
import { observarProcedimiento } from '@/core/observability/metrics';

const dbConfig: sql.config = {
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  server: env.DB_HOST,
  database: env.DB_NAME,
  port: env.DB_PORT,
  pool: { max: 20, min: 2, idleTimeoutMillis: 30000 },
  options: { encrypt: env.DB_ENCRYPT, trustServerCertificate: !env.DB_ENCRYPT },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export const getDbPool = async (): Promise<sql.ConnectionPool> => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig).connect();
  }
  return poolPromise;
};

const ejecutarOriginal = sql.Request.prototype.execute;

sql.Request.prototype.execute = function (this: sql.Request, ...args: any[]) {
  if (typeof args[args.length - 1] === 'function') return (ejecutarOriginal as any).apply(this, args);
  const inicio = process.hrtime.bigint();
  const medir = () => observarProcedimiento(String(args[0]), Number(process.hrtime.bigint() - inicio) / 1e9);
  const resultado = (ejecutarOriginal as any).apply(this, args) as Promise<unknown>;
  resultado.then(medir, medir);
  return resultado;
} as typeof sql.Request.prototype.execute;

export { sql };