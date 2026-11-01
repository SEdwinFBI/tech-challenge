import { ICommandHandler } from '@/core/cqrs/index';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { DeleteAddressCommand, DeleteAddressResult } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class DeleteAddressCommandHandler implements ICommandHandler<DeleteAddressCommand, DeleteAddressResult> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(cmd: DeleteAddressCommand): Promise<DeleteAddressResult> {
    return this.repo.deleteAddress(cmd.idDireccion, cmd.idUsuario);
  }
}
