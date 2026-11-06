export interface ScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: [string, string, string];
}

export interface IScoreClient {
  score(state: unknown, questions: Record<string, ScoreQuestion>): Promise<Record<string, number> | null>;
}
