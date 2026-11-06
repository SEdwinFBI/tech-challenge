import type { RecommendationOwner } from '../models/recomendaciones.model';
import type { IRecommendationViewRepository } from '../abstracts/recommendation-view.repository.interface';

export class RecordRecommendationViewCommandHandler {
  constructor(private readonly repo: IRecommendationViewRepository) {}

  async handle(owner: RecommendationOwner, idProducto: number): Promise<void> {
    await this.repo.recordView(owner, idProducto);
  }
}
