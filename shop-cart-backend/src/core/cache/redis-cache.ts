import { ICache } from './cache.interface';

export interface RedisCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>;
  scan(cursor: string, match: 'MATCH', pattern: string, count: 'COUNT', n: number): Promise<[string, string[]]>;
  del(...keys: string[]): Promise<number>;
}

export const CACHE_PREFIX = 'shopcart:cache:';

export class RedisCache implements ICache {
  constructor(private readonly redis: RedisCacheClient) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(CACHE_PREFIX + key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (err) {
      console.error('Cache Redis (lectura):', (err as Error).message);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(CACHE_PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      console.error('Cache Redis (escritura):', (err as Error).message);
    }
  }

  async clear(): Promise<void> {
    let cursor = '0';
    do {
      const [siguiente, claves] = await this.redis.scan(cursor, 'MATCH', `${CACHE_PREFIX}*`, 'COUNT', 200);
      cursor = siguiente;
      if (claves.length > 0) await this.redis.del(...claves);
    } while (cursor !== '0');
  }
}
