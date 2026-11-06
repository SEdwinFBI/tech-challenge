import type { ICommandHandler } from '@/core/cqrs/index';
import type { IRecommendationsRepository } from '../abstracts/recomendaciones.repository.interface';
import { RecommendationOwnerPolicy } from '../domain/recommendation-owner';
import type { RecordViewCommand } from '../models/recomendaciones.schema';
import { RecommendationsRepository } from '../repository/recomendaciones.repository';

export class RecordViewCommandHandler implements ICommandHandler<RecordViewCommand, void> {
  constructor(private readonly repo: IRecommendationsRepository = new RecommendationsRepository()) {}

  async handle(command: RecordViewCommand): Promise<void> {
    const owner = RecommendationOwnerPolicy.resolve(command);
    await this.repo.recordView(owner, command.idProducto);
  }
}
