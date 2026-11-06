import { createHash } from 'node:crypto';
import type { IQueryHandler } from '@/core/cqrs/index';
import type { ICache } from '@/core/cache/cache.interface';
import { obtenerCache } from '@/core/cache/cache.factory';
import type { IRecommendationsRepository } from '../abstracts/recomendaciones.repository.interface';
import type { IRecommendationRanker } from '../abstracts/recommendation-ranker.interface';
import { RecommendationOwnerPolicy } from '../domain/recommendation-owner';
import { RecommendationPolicy } from '../domain/recommendation.policy';
import { JevRecommendationRanker } from '../infrastructure/jev-recommendation.ranker';
import type { GetRecommendationsQuery, RecommendationFilters, RecommendationOwner, RecommendationResult } from '../models/recomendaciones.schema';
import { RecommendationsRepository } from '../repository/recomendaciones.repository';

export class GetRecommendationsQueryHandler implements IQueryHandler<GetRecommendationsQuery, RecommendationResult> {
  private readonly pending = new Map<string, Promise<RecommendationResult>>();

  constructor(
    private readonly repo: IRecommendationsRepository = new RecommendationsRepository(),
    private readonly ranker: IRecommendationRanker = new JevRecommendationRanker(),
    private readonly cache: ICache = obtenerCache(),
  ) {}

  async handle(query: GetRecommendationsQuery): Promise<RecommendationResult> {
    const owner = RecommendationOwnerPolicy.resolve(query);
    const filters: RecommendationFilters = { idCategoria: query.idCategoria, precioMin: query.precioMin, precioMax: query.precioMax, q: query.q };
    const key = 'recs_v3_' + createHash('sha256').update(JSON.stringify([owner.propietario, query.contexto, query.idProducto ?? null, filters])).digest('hex');
    const cached = await this.cache.get<RecommendationResult>(key);
    if (cached) return cached;
    const existing = this.pending.get(key);
    if (existing) return existing;
    const work = this.build(owner, query, filters, key);
    this.pending.set(key, work);
    try { return await work; } finally { this.pending.delete(key); }
  }

  private async build(owner: RecommendationOwner, query: GetRecommendationsQuery, filters: RecommendationFilters, key: string): Promise<RecommendationResult> {
    const placement = query.contexto;
    const context = RecommendationPolicy.prepare(await this.repo.getContext(owner, query.idProducto, placement, filters), placement, query.idProducto);
    const ids = await this.ranker.rank(context, placement);
    const result: RecommendationResult = { items: RecommendationPolicy.arrange(context.candidates, ids), origen: ids ? 'jev' : 'preferencias' };
    await this.cache.set(key, result, ids ? 180 : 30);
    return result;
  }
}
