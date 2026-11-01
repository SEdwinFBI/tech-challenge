import { CartDetailResult, UpsertItemParams } from '../models/carrito.model';

export interface ICartRepository {
  getCartDetail(idUsuario?: number, tokenInvitado?: string): Promise<CartDetailResult>;
  upsertItem(params: UpsertItemParams): Promise<void>;
}
