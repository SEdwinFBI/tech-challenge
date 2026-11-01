import sql from 'mssql';
import { env } from './env';

const dbConfig: sql.config = {
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  server: env.DB_HOST,
  database: env.DB_NAME,
  port: env.DB_PORT,
  pool: { max: 20, min: 2, idleTimeoutMillis: 30000 },
  options: { encrypt: false, trustServerCertificate: true },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export const getDbPool = async (): Promise<sql.ConnectionPool> => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig).connect();
  }
  return poolPromise;
};

export { sql };