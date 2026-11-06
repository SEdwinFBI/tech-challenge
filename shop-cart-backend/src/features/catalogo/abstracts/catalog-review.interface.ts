import type { CatalogReviewContext, CatalogReviewInput } from '../models/catalog-review.model';

export interface ICatalogReviewRepository {
  context(input: CatalogReviewInput): Promise<CatalogReviewContext>;
}
