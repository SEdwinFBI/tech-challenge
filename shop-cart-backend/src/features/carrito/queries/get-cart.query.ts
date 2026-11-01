import { IQueryHandler } from '@/core/cqrs/index';
import { ICartRepository } from '../abstracts/carrito.repository.interface';
import { CartDetailResult, GetCartQuery } from '../models/carrito.schema';
import { CartRepository } from '../repository/carrito.repository';

export class GetCartQueryHandler implements IQueryHandler<GetCartQuery, CartDetailResult> {
  constructor(private readonly repo: ICartRepository = new CartRepository()) {}

  async handle(query: GetCartQuery): Promise<CartDetailResult> {
    return this.repo.getCartDetail(query.idUsuario, query.tokenInvitado);
  }
}
