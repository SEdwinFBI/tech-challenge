import { createHash } from 'node:crypto';
import { DomainError } from '@/core/domain/domain.error';
import type { RecommendationOwner } from '../models/recomendaciones.model';

export interface OwnerIdentity {
  idUsuario?: number;
  tokenInvitado?: unknown;
}

export const RecommendationOwnerPolicy = {
  resolve({ idUsuario, tokenInvitado }: OwnerIdentity): RecommendationOwner {
    if (idUsuario !== undefined) return { propietario: `u:${idUsuario}`, idUsuario };
    if (typeof tokenInvitado !== 'string' || tokenInvitado.length < 16 || tokenInvitado.length > 100) {
      throw new DomainError('Falta la sesion de visitante.', 'MISSING_CART_OWNER', 400);
    }
    return { propietario: 'g:' + createHash('sha256').update(tokenInvitado).digest('hex'), tokenInvitado };
  },
};
