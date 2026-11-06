import { z } from 'zod';

const positiveId = z.coerce.number().int().positive();

export const GetRecommendationsSchema = z.object({
  idProducto: positiveId.optional(),
  contexto: z.enum(['producto', 'carrito', 'inicio', 'favoritos', 'ofertas']).default('producto'),
  idCategoria: positiveId.optional(),
  precioMin: z.coerce.number().min(0).optional(),
  precioMax: z.coerce.number().min(0).optional(),
  q: z.string().trim().max(150).optional(),
}).refine(q => q.precioMin === undefined || q.precioMax === undefined || q.precioMin <= q.precioMax, {
  message: 'Rango de precios invalido.', path: ['precioMax'],
});

export const RecordRecommendationViewSchema = z.object({ idProducto: positiveId });
export const RecommendationGuestTokenSchema = z.string().min(16).max(100);

export const GetSearchRecommendationSchema = z.object({
  q: z.string().trim().min(2).max(150),
  idCategoria: positiveId.optional(),
  precioMin: z.coerce.number().min(0).optional(),
  precioMax: z.coerce.number().min(0).optional(),
  soloOfertas: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
}).refine(q => q.precioMin === undefined || q.precioMax === undefined || q.precioMin <= q.precioMax, {
  message: 'Rango de precios invalido.', path: ['precioMax'],
});
