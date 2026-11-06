import { createHash } from 'node:crypto';
import type { IQueryHandler } from '@/core/cqrs/index';
import type { ICache } from '@/core/cache/cache.interface';
import { obtenerCache } from '@/core/cache/cache.factory';
import type { IRecommendationsRepository } from '../abstracts/recomendaciones.repository.interface';
import type { ISearchProductSelector } from '../abstracts/search-product-selector.interface';
import { RecommendationPolicy } from '../domain/recommendation.policy';
import { JevSearchProductSelector } from '../infrastructure/jev-search-product.selector';
import type { GetSearchRecommendationQuery, SearchRecommendationResult } from '../models/recomendaciones.schema';
import { RecommendationsRepository } from '../repository/recomendaciones.repository';

export class GetSearchRecommendationQueryHandler implements IQueryHandler<GetSearchRecommendationQuery, SearchRecommendationResult> {
  constructor(
    private readonly repo: IRecommendationsRepository = new RecommendationsRepository(),
    private readonly selector: ISearchProductSelector = new JevSearchProductSelector(),
    private readonly cache: ICache = obtenerCache(),
  ) {}

  async handle(query: GetSearchRecommendationQuery): Promise<SearchRecommendationResult> {
    if (!RecommendationPolicy.canUseAi(query.q)) return { item: null };
    const normalized = query.q.trim().toLowerCase().replace(/\s+/g, ' ');
    const key = 'search_rec_v4_' + createHash('sha256')
      .update(JSON.stringify([normalized, query.idCategoria ?? null, query.precioMin ?? null, query.precioMax ?? null, query.soloOfertas])).digest('hex');
    const cached = await this.cache.get<SearchRecommendationResult>(key);
    if (cached) return cached;
    const candidates = RecommendationPolicy.searchCandidates(await this.repo.findSearchCandidates(query));
    const scores = candidates.length ? await this.selector.score(query.q, candidates) : null;
    const result = RecommendationPolicy.bestSearchMatch(candidates, scores);
    await this.cache.set(key, result, result.item ? 180 : 30);
    return result;
  }
}
