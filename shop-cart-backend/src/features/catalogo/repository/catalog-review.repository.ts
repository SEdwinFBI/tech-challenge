import { getDbPool, sql } from '@/core/config/db';
import type { ICatalogReviewRepository } from '../abstracts/catalog-review.interface';
import type { CatalogReviewContext, CatalogReviewInput } from '../models/catalog-review.model';

export class CatalogReviewRepository implements ICatalogReviewRepository {
  async context(input: CatalogReviewInput): Promise<CatalogReviewContext> {
    const pool = await getDbPool();
    const result = await pool.request().input('Nombre', sql.NVarChar(150), input.nombre)
      .input('IDProducto', sql.Int, input.idProducto ?? null).execute('SP_Catalogo_ContextoRevision');
    const sets = result.recordsets as [sql.IRecordSet<CatalogReviewContext['categories'][number]>, sql.IRecordSet<CatalogReviewContext['products'][number]>];
    return { categories: sets[0] ?? [], products: sets[1] ?? [] };
  }
}
