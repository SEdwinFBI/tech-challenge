import { getDbPool, sql } from '@/core/config/db';
import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import type { SearchRecommendationInput } from '../models/search-recommendation.model';
import type { ISearchCandidateRepository } from '../abstracts/search-candidate.repository.interface';

export class SearchCandidateRepository implements ISearchCandidateRepository {
  async candidates(input: SearchRecommendationInput): Promise<ProductDTO[]> {
    const pool = await getDbPool();
    const result = await pool.request().input('Busqueda', sql.NVarChar(150), input.q)
      .input('IDCategoria', sql.Int, input.idCategoria ?? null)
      .input('PrecioMin', sql.Decimal(12, 2), input.precioMin ?? null)
      .input('PrecioMax', sql.Decimal(12, 2), input.precioMax ?? null)
      .input('SoloOfertas', sql.Bit, input.soloOfertas ?? false)
      .execute<ProductDTO>('SP_Recomendaciones_BuscarCandidatos');
    return result.recordset;
  }
}
