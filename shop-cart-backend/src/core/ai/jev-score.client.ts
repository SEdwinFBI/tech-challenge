import { z } from 'zod';
import type { IScoreClient, ScoreQuestion } from './score-client.interface';

const responseSchema = z.object({ answers: z.record(z.string(), z.object({ score: z.number().min(0).max(2) })) });

export class JevScoreClient implements IScoreClient {
  private retryAt = 0;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly request: typeof fetch = fetch,
  ) {}

  async score(state: unknown, questions: Record<string, ScoreQuestion>): Promise<Record<string, number> | null> {
    if (!this.apiKey || Date.now() < this.retryAt || Object.keys(questions).length === 0) return null;
    try {
      const response = await this.request('https://api.typesafe.ai/v1/systemone', {
        method: 'POST', signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, questions, state: JSON.stringify(state) }),
      });
      if (!response.ok) throw new Error('JEV_UNAVAILABLE');
      const parsed = responseSchema.parse(await response.json());
      if (Object.keys(questions).some(key => !parsed.answers[key])) throw new Error('JEV_INVALID_RESPONSE');
      return Object.fromEntries(Object.keys(questions).map(key => [key, parsed.answers[key]!.score]));
    } catch {
      this.retryAt = Date.now() + 30_000;
      return null;
    }
  }
}
