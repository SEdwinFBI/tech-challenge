import { IQueryHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { IProductReviewer } from '../abstracts/product-reviewer.interface';
import { CatalogReviewPolicy } from '../domain/catalog-review.policy';
import { JevProductReviewer } from '../infrastructure/jev-product.reviewer';
import { CatalogReviewResult, ReviewCatalogProductQuery } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

export class ReviewCatalogProductQueryHandler implements IQueryHandler<ReviewCatalogProductQuery, CatalogReviewResult> {
  constructor(
    private readonly repo: ICatalogRepository = new CatalogRepository(),
    private readonly reviewer: IProductReviewer = new JevProductReviewer(),
  ) {}

  async handle(query: ReviewCatalogProductQuery): Promise<CatalogReviewResult> {
    const context = CatalogReviewPolicy.comparable(await this.repo.getReviewContext(query), query.idProducto);
    const scores = await this.reviewer.score(query, context);
    return CatalogReviewPolicy.evaluate(query.nombre, context, scores);
  }
}
