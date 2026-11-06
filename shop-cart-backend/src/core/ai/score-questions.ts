import type { ScoreQuestion } from './score-client.interface';

export const scoreKey = (prefix: string, id: number) => `${prefix}${id}`;

export function buildScoreQuestions<T>(
  items: readonly T[],
  prefix: string,
  idOf: (item: T) => number,
  describe: (item: T) => Pick<ScoreQuestion, 'instructions' | 'criteria'>,
): Record<string, ScoreQuestion> {
  return Object.fromEntries(items.map(item => [scoreKey(prefix, idOf(item)), { type: 'score', ...describe(item) } satisfies ScoreQuestion]));
}

export function rankByScore<T>(items: readonly T[], scores: Record<string, number>, prefix: string, idOf: (item: T) => number): T[] {
  return [...items].sort((a, b) => scores[scoreKey(prefix, idOf(b))]! - scores[scoreKey(prefix, idOf(a))]!);
}

export function scoresById<T>(items: readonly T[], scores: Record<string, number>, prefix: string, idOf: (item: T) => number): Map<number, number> {
  return new Map(items.map(item => [idOf(item), scores[scoreKey(prefix, idOf(item))]!]));
}
