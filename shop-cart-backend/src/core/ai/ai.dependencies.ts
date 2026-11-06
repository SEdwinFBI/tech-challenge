import { env } from '@/core/config/env';
import { JevScoreClient } from './jev-score.client';

export const jevScoreClient = new JevScoreClient(env.TYPESAFE_API_KEY, env.JEV_MODEL, env.JEV_TIMEOUT_MS);
