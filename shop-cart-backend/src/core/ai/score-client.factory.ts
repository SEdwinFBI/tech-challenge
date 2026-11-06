import { env } from '@/core/config/env';
import { getRedis } from '@/core/config/redis';
import { JevScoreClient } from './jev-score.client';
import type { IScoreClient, ScoreQuestion } from './score-client.interface';

export interface AiBudgetRedis {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export class AiBudget {
  private memoryWindow = 0;
  private memoryCount = 0;

  constructor(
    private readonly limit: number = 30,
    private readonly redis: AiBudgetRedis | null = getRedis(),
    private readonly now: () => number = Date.now,
  ) {}

  async take(): Promise<boolean> {
    const window = Math.floor(this.now() / 60_000);
    if (this.redis) {
      try {
        const key = `shopcart:ai:presupuesto:${window}`;
        const used = await this.redis.incr(key);
        if (used === 1) await this.redis.expire(key, 120);
        return used <= this.limit;
      } catch {
        /* Redis caido: se usa el contador local de este proceso */
      }
    }
    if (window !== this.memoryWindow) { this.memoryWindow = window; this.memoryCount = 0; }
    return ++this.memoryCount <= this.limit;
  }
}

export class BudgetedScoreClient implements IScoreClient {
  constructor(
    private readonly inner: IScoreClient = new JevScoreClient(),
    private readonly budget: AiBudget = new AiBudget(),
    private readonly enabled: boolean = Boolean(env.TYPESAFE_API_KEY),
  ) {}

  async score(state: unknown, questions: Record<string, ScoreQuestion>): Promise<Record<string, number> | null> {
    if (!this.enabled || !(await this.budget.take())) return null;
    return this.inner.score(state, questions);
  }
}

let instancia: IScoreClient | null = null;

export function obtenerScoreClient(): IScoreClient {
  if (!instancia) instancia = new BudgetedScoreClient();
  return instancia;
}
