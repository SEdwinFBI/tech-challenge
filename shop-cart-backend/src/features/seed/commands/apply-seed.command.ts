import { env } from '@/core/config/env';
import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { ISeedRepository } from '../abstracts/seed.repository.interface';
import { SeedResult } from '../models/seed.model';
import { SeedRepository } from '../repository/seed.repository';

export class ApplySeedCommandHandler implements ICommandHandler<void, SeedResult> {
  constructor(private readonly repo: ISeedRepository = new SeedRepository()) {}

  async handle(): Promise<SeedResult> {
    if (env.NODE_ENV !== 'development') {
      throw new DomainError('Solo disponible en desarrollo.', 'FORBIDDEN_ENV', 403);
    }

    return this.repo.applySeed();
  }
}
