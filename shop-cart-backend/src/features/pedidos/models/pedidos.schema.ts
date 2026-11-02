import { z } from 'zod';
import { AuthUser } from '@/core/middlewares/auth.middleware';

export * from './pedidos.model';

export const GetOrdersSchema = z.object({
  estado: z.string().optional(),
  idCliente: z.coerce.number().int().positive().optional(),
  numeroSeguimiento: z.string().trim().max(100).optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(100).default(15),
});

export type GetOrdersDTO = z.infer<typeof GetOrdersSchema>;

export const UpdateOrderStatusSchema = z.object({
  idPedido: z.coerce.number().int().positive(),
  nuevoEstado: z.enum(['EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO']),
  comentario: z.string().max(300).optional(),
});

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;

export const ReturnOrderLineSchema = z.object({
  idPedido: z.coerce.number().int().positive(),
  idPedidoDetalle: z.number().int().positive(),
  cantidadADevolver: z.number().int().positive(),
  motivo: z.string().min(5),
});

export type ReturnOrderLineDTO = z.infer<typeof ReturnOrderLineSchema>;

export type GetOrdersQuery = GetOrdersDTO & {
  solicitante: AuthUser;
};

export interface GetOrderByIdQuery {
  idPedido: number;
  solicitante: AuthUser;
}

export type UpdateOrderStatusCommand = UpdateOrderStatusDTO & {
  ejecutor: AuthUser;
};

export type ReturnOrderLineCommand = ReturnOrderLineDTO & {
  idOperador: number;
};
