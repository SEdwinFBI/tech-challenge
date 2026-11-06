import type { ICommandHandler } from '@/core/cqrs/index';
import type { IRecommendationsRepository } from '../abstracts/recomendaciones.repository.interface';
import { RecommendationsRepository } from '../repository/recomendaciones.repository';

export class PurgeViewsCommandHandler implements ICommandHandler<void, void> {
  constructor(private readonly repo: IRecommendationsRepository = new RecommendationsRepository()) {}

  async handle(): Promise<void> {
    await this.repo.purgeViews();
  }
}
