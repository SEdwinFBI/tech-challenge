import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { ICartRepository } from '../abstracts/carrito.repository.interface';
import { CartDetailResult, UpsertCartItemCommand } from '../models/carrito.schema';
import { CartRepository } from '../repository/carrito.repository';

export class UpsertCartItemCommandHandler implements ICommandHandler<UpsertCartItemCommand, CartDetailResult> {
  constructor(private readonly repo: ICartRepository = new CartRepository()) {}

  async handle(cmd: UpsertCartItemCommand): Promise<CartDetailResult> {
    if (!cmd.idUsuario && !cmd.tokenInvitado) {
      throw new DomainError('Falta sesión o cabecera X-Guest-Token.', 'MISSING_CART_OWNER', 400);
    }

    await this.repo.upsertItem({
      idUsuario: cmd.idUsuario,
      tokenInvitado: cmd.tokenInvitado,
      idVariante: cmd.idVariante,
      cantidad: cmd.cantidad,
    });

    return this.repo.getCartDetail(cmd.idUsuario, cmd.tokenInvitado);
  }
}
