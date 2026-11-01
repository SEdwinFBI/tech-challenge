import { IQueryHandler } from '@/core/cqrs/index';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { AddressDTO, GetAddressesQuery } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class GetAddressesQueryHandler implements IQueryHandler<GetAddressesQuery, AddressDTO[]> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(query: GetAddressesQuery): Promise<AddressDTO[]> {
    return this.repo.getAddresses(query.idUsuario);
  }
}
