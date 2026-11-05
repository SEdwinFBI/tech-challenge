import { Response } from 'express';

class SseAndCacheManager {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private clients = new Set<Response>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size === 0) return;
      for (const client of this.clients) {
        try {
          client.write(': heartbeat\n\n');
        } catch {
          this.clients.delete(client);
        }
      }
    }, 25000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlSeconds = 180) {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  clearCache() {
    this.cache.clear();
  }

  invalidateAndBroadcast(event: string, payload: unknown) {
    this.clearCache();
    const frame = `data: ${JSON.stringify({ event, payload, timestamp: new Date().toISOString() })}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(frame);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  subscribe(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write(`: connected\n\n`);

    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  addClient(res: Response) {
    this.subscribe(res);
  }
}

export const sseCacheManager = new SseAndCacheManager();
