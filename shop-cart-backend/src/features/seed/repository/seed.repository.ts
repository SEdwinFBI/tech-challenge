import { getDbPool } from '@/core/config/db';
import { ISeedRepository } from '../abstracts/seed.repository.interface';
import { SeedResult } from '../models/seed.model';

export class SeedRepository implements ISeedRepository {
  async applySeed(): Promise<SeedResult> {
    const pool = await getDbPool();
    const res = await pool.request().execute('SP_Sistema_AplicarSeed');
    return res.recordset[0];
  }
}
