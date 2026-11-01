import { z } from 'zod';

export * from './bitacora.model';

export const GetBitacoraSchema = z.object({
  modulo: z.string().optional().nullable(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetBitacoraDTO = z.infer<typeof GetBitacoraSchema>;

export type GetBitacoraQuery = GetBitacoraDTO;
