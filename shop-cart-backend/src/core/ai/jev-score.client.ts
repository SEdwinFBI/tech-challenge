import { z } from 'zod';
import { env } from '@/core/config/env';
import type { ICache } from '@/core/cache/cache.interface';
import { obtenerCache } from '@/core/cache/cache.factory';
import type { IScoreClient, ScoreQuestion } from './score-client.interface';

const responseSchema = z.object({ answers: z.record(z.string(), z.object({ score: z.number().min(0).max(2) })) });
const BREAKER_KEY = 'ai_breaker';
const BREAKER_SECONDS = 30;

class JevFailure extends Error {
  constructor(readonly code: string) { super(code); }
}

export class JevScoreClient implements IScoreClient {
  private retryAt = 0;

  constructor(
    private readonly apiKey: string | undefined = env.TYPESAFE_API_KEY,
    private readonly model: string = env.JEV_MODEL,
    private readonly timeoutMs: number = env.JEV_TIMEOUT_MS,
    private readonly url: string = env.JEV_URL ?? 'https://api.typesafe.ai/v1/systemone',
    private readonly request: typeof fetch = fetch,
    private readonly breaker: ICache = obtenerCache(),
  ) {}

  async score(state: unknown, questions: Record<string, ScoreQuestion>): Promise<Record<string, number> | null> {
    if (!this.apiKey || Date.now() < this.retryAt || Object.keys(questions).length === 0) return null;
    if (await this.breaker.get<boolean>(BREAKER_KEY).catch(() => null)) return null;
    try {
      const response = await this.request(this.url, {
        method: 'POST', signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, questions, state: JSON.stringify(state) }),
      });
      if (!response.ok) throw new JevFailure(`HTTP_${response.status}`);
      const parsed = responseSchema.parse(await response.json());
      if (Object.keys(questions).some(key => !parsed.answers[key])) throw new JevFailure('INVALID_RESPONSE');
      return Object.fromEntries(Object.keys(questions).map(key => [key, parsed.answers[key]!.score]));
    } catch (err) {
      console.warn('JEV no disponible:', err instanceof JevFailure ? err.code : err instanceof Error ? `${err.name}: ${this.apiKey ? err.message.replaceAll(this.apiKey, '***') : err.message}` : 'UNKNOWN');
      this.retryAt = Date.now() + BREAKER_SECONDS * 1000;
      await this.breaker.set(BREAKER_KEY, true, BREAKER_SECONDS).catch(() => undefined);
      return null;
    }
  }
}
