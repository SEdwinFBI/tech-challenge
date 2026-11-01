import { ICommandHandler } from '@/core/cqrs/index';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { ReserveStockCommand, ReserveStockResult } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class ReserveStockCommandHandler implements ICommandHandler<ReserveStockCommand, ReserveStockResult> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(cmd: ReserveStockCommand): Promise<ReserveStockResult> {
    return this.repo.reserveStock(cmd.idUsuario, cmd.idCarrito);
  }
}
