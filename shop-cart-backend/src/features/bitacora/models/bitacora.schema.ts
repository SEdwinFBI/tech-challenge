import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';

export * from './bitacora.model';

export const GetBitacoraSchema = z
  .object({
    modulo: z.string().trim().max(50).optional().nullable(),
    accion: z.string().trim().max(50).optional(),
    busqueda: z.string().trim().max(150).optional(),
    fechaDesde: z.coerce.date().optional(),
    fechaHasta: z.coerce.date().optional(),
    orden: z.enum(['fecha', 'modulo', 'usuario']).default('fecha'),
    direccion: DireccionSchema,
    pagina: z.coerce.number().int().min(1).default(1),
    tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((d) => !d.fechaDesde || !d.fechaHasta || d.fechaDesde <= d.fechaHasta, {
    path: ['fechaHasta'],
    message: 'La fecha final no puede ser anterior a la inicial.',
  });

export type GetBitacoraDTO = z.infer<typeof GetBitacoraSchema>;

export type GetBitacoraQuery = GetBitacoraDTO;
