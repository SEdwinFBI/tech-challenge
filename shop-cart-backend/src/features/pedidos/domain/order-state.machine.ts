import { DomainError } from '@/core/domain/domain.error';
import { UserRole } from '@/core/middlewares/auth.middleware';
import { OrderStatus } from '../models/pedidos.model';

export type { OrderStatus };

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE_PAGO: ['PAGADO', 'CANCELADO'],
  PAGADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['DESPACHADO', 'ENVIADO', 'CANCELADO'],
  DESPACHADO: ['ENTREGADO'],
  ENVIADO: ['ENTREGADO'],
  ENTREGADO: ['DEVUELTO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL'],
  CANCELADO: [],
  DEVUELTO: [],
  DEVUELTO_PARCIAL: ['DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL', 'DEVUELTO'],
  DEVUELTO_TOTAL: [],
};

export class OrderStatePolicy {
  public static ensureValidTransition(
    estadoActual: OrderStatus,
    nuevoEstado: OrderStatus,
    rolEjecutor: UserRole
  ): void {
    if (rolEjecutor === 'CLIENTE' && nuevoEstado !== 'CANCELADO') {
      throw new DomainError('El cliente solo puede cancelar pedidos no despachados.', 'FORBIDDEN_STATE', 403);
    }

    const siguientes = ALLOWED_TRANSITIONS[estadoActual] || [];
    if (!siguientes.includes(nuevoEstado)) {
      throw new DomainError(
        `Transición no permitida de ${estadoActual} a ${nuevoEstado}.`,
        'INVALID_STATE_TRANSITION',
        409
      );
    }
  }
}
