import { getDbPool, sql } from '@/core/config/db';
import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import type { PreferenceSignal, RecommendationOwner, RecommendationPlacement, RecommendationFilters } from '../models/recomendaciones.model';
import type { IRecommendationViewRepository } from '../abstracts/recommendation-view.repository.interface';
import type { IRecommendationContextRepository } from '../abstracts/recommendation-context.repository.interface';

export class RecommendationRepository implements IRecommendationViewRepository, IRecommendationContextRepository {
  async recordView(owner: RecommendationOwner, idProducto: number): Promise<void> {
    const pool = await getDbPool();
    await pool.request().input('Propietario', sql.VarChar(70), owner.propietario)
      .input('IDProducto', sql.Int, idProducto).execute('SP_Recomendaciones_RegistrarVista');
  }

  async context(owner: RecommendationOwner, idProducto?: number, placement: RecommendationPlacement = 'producto', filters: RecommendationFilters = {}) {
    const pool = await getDbPool();
    const result = await pool.request().input('Propietario', sql.VarChar(70), owner.propietario)
      .input('IDUsuario', sql.Int, owner.idUsuario ?? null)
      .input('TokenInvitado', sql.VarChar(100), owner.tokenInvitado ?? null)
      .input('IDProducto', sql.Int, idProducto ?? null)
      .input('Contexto', sql.VarChar(20), placement)
      .input('IDCategoria', sql.Int, filters.idCategoria ?? null)
      .input('PrecioMin', sql.Decimal(12, 2), filters.precioMin ?? null)
      .input('PrecioMax', sql.Decimal(12, 2), filters.precioMax ?? null)
      .input('Busqueda', sql.NVarChar(150), filters.q ?? null)
      .execute('SP_Recomendaciones_ObtenerContexto');
    const sets = result.recordsets as [sql.IRecordSet<PreferenceSignal>, sql.IRecordSet<ProductDTO>];
    return { signals: sets[0] ?? [], candidates: sets[1] ?? [] };
  }
}
