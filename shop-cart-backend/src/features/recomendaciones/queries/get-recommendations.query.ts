import { createHash } from 'node:crypto';
import type { ICache } from '@/core/cache/cache.interface';
import type { RecommendationOwner, RecommendationPlacement, RecommendationFilters, RecommendationResult } from '../models/recomendaciones.model';
import type { IRecommendationRanker } from '../abstracts/recommendation-ranker.interface';
import type { IRecommendationContextRepository } from '../abstracts/recommendation-context.repository.interface';
import { recommendationPolicies } from '../domain/recommendation-policies';

export class GetRecommendationsQueryHandler {
  private readonly pending = new Map<string, Promise<RecommendationResult>>();

  constructor(
    private readonly repo: IRecommendationContextRepository,
    private readonly ranker: IRecommendationRanker,
    private readonly cache: ICache,
  ) {}

  async handle(owner: RecommendationOwner, idProducto?: number, placement: RecommendationPlacement = 'producto', filters: RecommendationFilters = {}): Promise<RecommendationResult> {
    const context = await this.repo.context(owner, idProducto, placement, filters);
    const policy = recommendationPolicies[placement];
    const excluded = new Set(context.signals.filter(s => s.Tipo === 'CARRITO').map(s => s.IDProducto));
    if (policy.excludesFavorites) context.signals.filter(s => s.Tipo === 'FAVORITO').forEach(s => excluded.add(s.IDProducto));
    context.signals = policy.signals(context);
    if (placement === 'favoritos' && !context.signals.length) return { items: [], origen: 'preferencias' };
    context.candidates = context.candidates.filter((p, index, all) => p.Activo && (p.StockTotalDisponible ?? 0) > 0
      && p.IDProducto !== idProducto && !excluded.has(p.IDProducto) && all.findIndex(x => x.IDProducto === p.IDProducto) === index
      && (placement !== 'ofertas' || (p.PorcentajeDescuento ?? 0) >= 1));
    const key = 'recs_v2_' + createHash('sha256').update(JSON.stringify([owner.propietario, placement, filters, context])).digest('hex');
    const cached = await this.cache.get<RecommendationResult>(key);
    if (cached) return cached;
    const existing = this.pending.get(key);
    if (existing) return existing;
    const work = (async () => {
      const ids = await this.ranker.rank(context, placement);
      const positions = new Map(ids?.map((id, i) => [id, i]));
      const items = [...context.candidates].sort((a, b) => (positions.get(a.IDProducto) ?? 100) - (positions.get(b.IDProducto) ?? 100)).slice(0, 10);
      const result: RecommendationResult = { items, origen: ids ? 'jev' : 'preferencias' };
      await this.cache.set(key, result, ids ? 180 : 30);
      return result;
    })();
    this.pending.set(key, work);
    try { return await work; } finally { this.pending.delete(key); }
  }
}
