import { getDbPool, sql } from '@/core/config/db';
import { withPublicImages } from '@/features/catalogo/infrastructure/public-image.resolver';
import { ICartRepository } from '../abstracts/carrito.repository.interface';
import {
  CartDetailResult,
  CartItemDTO,
  CartSummaryDTO,
  UpsertItemParams,
} from '../models/carrito.model';

async function withDeadlockRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const isDeadlock =
        err?.number === 1205 ||
        err?.originalError?.info?.number === 1205 ||
        String(err?.message || '').includes('deadlock');
      if (isDeadlock && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt + Math.floor(Math.random() * 50)));
        continue;
      }
      throw err;
    }
  }
}

export class CartRepository implements ICartRepository {
  async getCartDetail(idUsuario?: number, tokenInvitado?: string): Promise<CartDetailResult> {
    return withDeadlockRetry(async () => {
      const pool = await getDbPool();
      const res = await pool
        .request()
        .input('IDUsuario', sql.Int, idUsuario ?? null)
        .input('TokenInvitado', sql.VarChar(100), tokenInvitado ?? null)
        .execute('SP_Carritos_ObtenerDetalle');

      const sets = res.recordsets as [
        sql.IRecordSet<CartItemDTO> | undefined,
        sql.IRecordSet<CartSummaryDTO> | undefined,
      ];
      return {
        items: withPublicImages(sets[0] || [], 'ImagenUrl'),
        resumen: sets[1]?.[0] || {
          IDCarrito: null,
          CodigoCuponAplicado: null,
          Subtotal: 0,
          Descuento: 0,
          Total: 0,
        },
      };
    });
  }

  async upsertItem(params: UpsertItemParams): Promise<void> {
    return withDeadlockRetry(async () => {
      const pool = await getDbPool();
      await pool
        .request()
        .input('IDUsuario', sql.Int, params.idUsuario ?? null)
        .input('TokenInvitado', sql.VarChar(100), params.tokenInvitado ?? null)
        .input('IDVariante', sql.Int, params.idVariante)
        .input('Cantidad', sql.Int, params.cantidad)
        .execute('SP_Carritos_GestionarItem');
    });
  }
}
