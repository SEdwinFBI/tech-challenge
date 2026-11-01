import { z } from 'zod';

export * from './carrito.model';

export const UpsertCartItemSchema = z.object({
  idVariante: z.number().int().positive(),
  cantidad: z.number().int().min(0),
});

export type UpsertCartItemDTO = z.infer<typeof UpsertCartItemSchema>;

export type UpsertCartItemCommand = UpsertCartItemDTO & {
  idUsuario?: number;
  tokenInvitado?: string;
};

export interface GetCartQuery {
  idUsuario?: number;
  tokenInvitado?: string;
}
