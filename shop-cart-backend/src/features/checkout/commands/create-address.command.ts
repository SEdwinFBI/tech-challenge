import { ICommandHandler } from '@/core/cqrs/index';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { AddressDTO, CreateAddressCommand } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class CreateAddressCommandHandler implements ICommandHandler<CreateAddressCommand, AddressDTO[]> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(cmd: CreateAddressCommand): Promise<AddressDTO[]> {
    return this.repo.createAddress(cmd);
  }
}
