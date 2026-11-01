import { SeedResult } from '../models/seed.model';

export interface ISeedRepository {
  applySeed(): Promise<SeedResult>;
}
