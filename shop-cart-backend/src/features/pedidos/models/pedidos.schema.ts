import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';
import { AuthUser } from '@/core/middlewares/auth.middleware';

export * from './pedidos.model';

export const GetOrdersSchema = z
  .object({
    estado: z.string().trim().max(30).optional(),
    idCliente: z.coerce.number().int().positive().optional(),
    numeroSeguimiento: z.string().trim().max(100).optional(),
    cliente: z.string().trim().max(100).optional(),
    fechaDesde: z.coerce.date().optional(),
    fechaHasta: z.coerce.date().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
    totalMin: z.coerce.number().nonnegative().optional(),
    totalMax: z.coerce.number().nonnegative().optional(),
    orden: z.enum(['fecha', 'total', 'estado', 'cliente']).default('fecha'),
    direccion: DireccionSchema,
    pagina: z.coerce.number().int().min(1).default(1),
    tamanoPagina: z.coerce.number().int().min(1).max(100).default(15),
  })
  .refine(
    (d) => {
      const desde = d.fechaDesde ?? d.fechaInicio;
      const hasta = d.fechaHasta ?? d.fechaFin;
      return !desde || !hasta || desde <= hasta;
    },
    { path: ['fechaHasta'], message: 'La fecha final no puede ser anterior a la inicial.' },
  )
  .refine((d) => d.totalMin === undefined || d.totalMax === undefined || d.totalMin <= d.totalMax, {
    path: ['totalMax'],
    message: 'El total máximo no puede ser menor al mínimo.',
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
