import { z } from 'zod';

export * from './recomendaciones.model';

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
export type GetRecommendationsDTO = z.infer<typeof GetRecommendationsSchema>;

export const RecordRecommendationViewSchema = z.object({ idProducto: positiveId });
export type RecordViewDTO = z.infer<typeof RecordRecommendationViewSchema>;

export const GetSearchRecommendationSchema = z.object({
  q: z.string().trim().min(2).max(150),
  idCategoria: positiveId.optional(),
  precioMin: z.coerce.number().min(0).optional(),
  precioMax: z.coerce.number().min(0).optional(),
  soloOfertas: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
}).refine(q => q.precioMin === undefined || q.precioMax === undefined || q.precioMin <= q.precioMax, {
  message: 'Rango de precios invalido.', path: ['precioMax'],
});
export type GetSearchRecommendationQuery = z.infer<typeof GetSearchRecommendationSchema>;

export interface RecommendationIdentity {
  idUsuario?: number;
  tokenInvitado?: string;
}

export type GetRecommendationsQuery = GetRecommendationsDTO & RecommendationIdentity;
export type RecordViewCommand = RecordViewDTO & RecommendationIdentity;
