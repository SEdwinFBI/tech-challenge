import { IQueryHandler } from '@/core/cqrs/index';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { MunicipalityDTO } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class GetMunicipalitiesQueryHandler implements IQueryHandler<void, MunicipalityDTO[]> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(): Promise<MunicipalityDTO[]> {
    return this.repo.getMunicipalities();
  }
}
