import { z } from 'zod';

export const ReviewCatalogProductSchema = z.object({
  nombre: z.string().trim().min(3).max(150),
  descripcion: z.string().trim().max(1000).optional(),
  idProducto: z.number().int().positive().optional(),
});
