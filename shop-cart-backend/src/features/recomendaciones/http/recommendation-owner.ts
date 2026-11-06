import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { DomainError } from '@/core/domain/domain.error';
import type { RecommendationOwner } from '../models/recomendaciones.model';
import { RecommendationGuestTokenSchema } from '../models/recomendaciones.schema';

export function resolveRecommendationOwner(req: Request): RecommendationOwner {
  if (req.user) return { propietario: `u:${req.user.idUsuario}`, idUsuario: req.user.idUsuario };
  const token = RecommendationGuestTokenSchema.safeParse(req.get('X-Guest-Token'));
  if (!token.success) throw new DomainError('Falta la sesion de visitante.', 'MISSING_CART_OWNER', 400);
  return { propietario: 'g:' + createHash('sha256').update(token.data).digest('hex'), tokenInvitado: token.data };
}
