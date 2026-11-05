import { getRedis } from '@/core/config/redis';
import { ICache } from './cache.interface';
import { MemoryCache } from './memory-cache';
import { RedisCache, RedisCacheClient } from './redis-cache';

export function crearCache(redis: RedisCacheClient | null = getRedis()): ICache {
  return redis ? new RedisCache(redis) : new MemoryCache();
}

let instancia: ICache | null = null;

export function obtenerCache(): ICache {
  if (!instancia) instancia = crearCache();
  return instancia;
}
