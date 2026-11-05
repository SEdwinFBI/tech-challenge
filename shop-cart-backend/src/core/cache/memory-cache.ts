import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICache } from './cache.interface';

export class MemoryCache implements ICache {
  async get<T>(key: string): Promise<T | null> {
    return sseCacheManager.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    sseCacheManager.set(key, value, ttlSeconds);
  }

  async clear(): Promise<void> {
    sseCacheManager.clearCache();
  }
}
