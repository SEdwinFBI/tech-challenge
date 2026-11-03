import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';

export * from './inventario.model';

export const GetKardexSchema = z
  .object({
    idVariante: z.coerce.number().int().positive().optional(),
    tipoMovimiento: z.string().trim().max(30).optional(),
    fechaDesde: z.coerce.date().optional(),
    fechaHasta: z.coerce.date().optional(),
    orden: z.enum(['fecha', 'cantidad', 'tipo']).default('fecha'),
    direccion: DireccionSchema,
    pagina: z.coerce.number().int().min(1).default(1),
    tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((d) => !d.fechaDesde || !d.fechaHasta || d.fechaDesde <= d.fechaHasta, {
    path: ['fechaHasta'],
    message: 'La fecha final no puede ser anterior a la inicial.',
  });

export type GetKardexDTO = z.infer<typeof GetKardexSchema>;

export const CreateMovementSchema = z.object({
  idVariante: z.number().int().positive(),
  tipoMovimiento: z.enum(['ENTRADA_COMPRA', 'AJUSTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO']),
  cantidad: z.number().int().refine((n) => n !== 0, 'La cantidad no puede ser 0'),
  motivo: z.string().min(5, 'El motivo es obligatorio (mínimo 5 caracteres)'),
  costoUnitario: z.number().nonnegative().optional(),
});

export type CreateMovementDTO = z.infer<typeof CreateMovementSchema>;

export type CreateMovementCommand = CreateMovementDTO & {
  idUsuario: number;
  idUsuarioOperador?: number;
};

export type GetKardexQuery = GetKardexDTO;
