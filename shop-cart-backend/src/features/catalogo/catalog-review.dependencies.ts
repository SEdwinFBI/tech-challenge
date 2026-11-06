import { ReviewCatalogProductQueryHandler } from './queries/review-catalog-product.query';
import { CatalogReviewRepository } from './repository/catalog-review.repository';
import { jevScoreClient } from '@/core/ai/ai.dependencies';

export const reviewCatalog = new ReviewCatalogProductQueryHandler(new CatalogReviewRepository(), jevScoreClient);
