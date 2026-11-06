import { getDbPool, sql } from '@/core/config/db';
import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import { conImagenesPublicas } from '@/features/catalogo/infrastructure/imagen-publica';
import type { IRecommendationsRepository } from '../abstracts/recomendaciones.repository.interface';
import type {
  GetSearchRecommendationQuery,
  PreferenceSignal,
  RecommendationContext,
  RecommendationFilters,
  RecommendationOwner,
  RecommendationPlacement,
} from '../models/recomendaciones.schema';

export class RecommendationsRepository implements IRecommendationsRepository {
  async recordView(owner: RecommendationOwner, idProducto: number): Promise<void> {
    const pool = await getDbPool();
    await pool.request().input('Propietario', sql.VarChar(70), owner.propietario)
      .input('IDProducto', sql.Int, idProducto).execute('SP_Recomendaciones_RegistrarVista');
  }

  async getContext(owner: RecommendationOwner, idProducto?: number, placement: RecommendationPlacement = 'producto', filters: RecommendationFilters = {}): Promise<RecommendationContext> {
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
    return { signals: sets[0] ?? [], candidates: conImagenesPublicas(sets[1] ?? [], 'ImagenUrl') };
  }

  async findSearchCandidates(input: GetSearchRecommendationQuery): Promise<ProductDTO[]> {
    const pool = await getDbPool();
    const result = await pool.request().input('Busqueda', sql.NVarChar(150), input.q)
      .input('IDCategoria', sql.Int, input.idCategoria ?? null)
      .input('PrecioMin', sql.Decimal(12, 2), input.precioMin ?? null)
      .input('PrecioMax', sql.Decimal(12, 2), input.precioMax ?? null)
      .input('SoloOfertas', sql.Bit, input.soloOfertas ?? false)
      .execute<ProductDTO>('SP_Recomendaciones_BuscarCandidatos');
    return conImagenesPublicas(result.recordset, 'ImagenUrl');
  }

  async purgeViews(): Promise<void> {
    const pool = await getDbPool();
    await pool.request().execute('SP_Recomendaciones_PurgarVistas');
  }
}
