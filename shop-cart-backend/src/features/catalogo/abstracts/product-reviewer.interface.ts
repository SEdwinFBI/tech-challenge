import type { CatalogReviewContext, CatalogReviewScores } from '../models/catalogo.model';
import type { ReviewCatalogProductQuery } from '../models/catalogo.schema';

export interface IProductReviewer {
  score(input: ReviewCatalogProductQuery, context: CatalogReviewContext): Promise<CatalogReviewScores | null>;
}
