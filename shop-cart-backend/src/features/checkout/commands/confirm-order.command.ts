import { ICommandHandler } from '@/core/cqrs/index';
import { sseCacheManager } from '@/core/http/sse-cache.manager';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { ConfirmOrderCommand, ConfirmOrderResult } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';

export class ConfirmOrderCommandHandler implements ICommandHandler<ConfirmOrderCommand, ConfirmOrderResult> {
  constructor(private readonly repo: ICheckoutRepository = new CheckoutRepository()) {}

  async handle(cmd: ConfirmOrderCommand): Promise<ConfirmOrderResult> {
    const resultado = await this.repo.confirmOrder(cmd);

    if (!resultado.FueIdempotente) {
      sseCacheManager.invalidateAndBroadcast('NUEVO_PEDIDO', { idPedido: resultado.IDPedido });
    }

    return resultado;
  }
}
