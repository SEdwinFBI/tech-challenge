import { ICommandHandler } from '@/core/cqrs/index';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { AddressDTO, SetDefaultAddressCommand } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class SetDefaultAddressCommandHandler implements ICommandHandler<SetDefaultAddressCommand, AddressDTO[]> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(cmd: SetDefaultAddressCommand): Promise<AddressDTO[]> {
    return this.repo.setDefaultAddress(cmd.idDireccion, cmd.idUsuario);
  }
}
