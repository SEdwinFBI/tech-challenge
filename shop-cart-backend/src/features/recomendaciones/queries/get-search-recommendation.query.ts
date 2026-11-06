import { createHash } from 'node:crypto';
import type { ICache } from '@/core/cache/cache.interface';
import type { ProductDTO } from '@/features/catalogo/models/catalogo.model';
import type { SearchRecommendationInput } from '../models/search-recommendation.model';
import type { ISearchCandidateRepository } from '../abstracts/search-candidate.repository.interface';
import type { ISearchProductSelector } from '../abstracts/search-product-selector.interface';

export class GetSearchRecommendationQueryHandler {
  constructor(private readonly repo: ISearchCandidateRepository, private readonly selector: ISearchProductSelector, private readonly cache: ICache) {}

  async handle(input: SearchRecommendationInput): Promise<{ item: ProductDTO | null }> {
    const candidates = (await this.repo.candidates(input)).filter((p, i, all) => p.Activo && (p.StockTotalDisponible ?? 0) > 0
      && all.findIndex(other => other.IDProducto === p.IDProducto) === i).slice(0, 20);
    if (!candidates.length) return { item: null };
    const key = 'search_rec_' + createHash('sha256').update(JSON.stringify([input, candidates])).digest('hex');
    const cached = await this.cache.get<{ item: ProductDTO | null }>(key);
    if (cached) return cached;
    const item = await this.selector.select(input.q, candidates);
    const result = { item: item && candidates.some(p => p.IDProducto === item.IDProducto) ? item : null };
    await this.cache.set(key, result, result.item ? 180 : 30);
    return result;
  }
}
