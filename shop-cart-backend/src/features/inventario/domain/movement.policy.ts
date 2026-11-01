import { DomainError } from '@/core/domain/domain.error';
import { KardexMovementType, MovementTypeInput, NormalizedMovement } from '../models/inventario.model';

export type { KardexMovementType, MovementTypeInput, NormalizedMovement };

export class InventoryMovementPolicy {
  public static validateAndNormalize(
    tipoMovimiento: MovementTypeInput,
    cantidad: number
  ): NormalizedMovement {
    if (cantidad === 0) {
      throw new DomainError('La cantidad del movimiento no puede ser 0.', 'CANTIDAD_INVALIDA', 400);
    }

    if (tipoMovimiento === 'ENTRADA_COMPRA' || tipoMovimiento === 'ENTRADA') {
      if (cantidad <= 0) {
        throw new DomainError('Cantidad para ENTRADA_COMPRA debe ser mayor a 0', 'CANTIDAD_INVALIDA', 400);
      }
      return {
        tipoMovimiento: 'ENTRADA_COMPRA',
        cantidad: Math.abs(cantidad),
      };
    }

    if (tipoMovimiento === 'AJUSTE_POSITIVO') {
      if (cantidad <= 0) {
        throw new DomainError('Cantidad para AJUSTE_POSITIVO debe ser mayor a 0', 'CANTIDAD_INVALIDA', 400);
      }
      return {
        tipoMovimiento: 'AJUSTE_POSITIVO',
        cantidad: Math.abs(cantidad),
      };
    }

    if (tipoMovimiento === 'AJUSTE_NEGATIVO') {
      return {
        tipoMovimiento: 'AJUSTE_NEGATIVO',
        cantidad: -Math.abs(cantidad),
      };
    }

    if (tipoMovimiento === 'SALIDA' || tipoMovimiento === 'SALIDA_MERMA') {
      return {
        tipoMovimiento: 'SALIDA_MERMA',
        cantidad: -Math.abs(cantidad),
      };
    }

    if (tipoMovimiento === 'AJUSTE_FISICO') {
      return {
        tipoMovimiento: 'AJUSTE_FISICO',
        cantidad,
      };
    }

    if (tipoMovimiento === 'AJUSTE') {
      if (cantidad > 0) {
        return {
          tipoMovimiento: 'AJUSTE_POSITIVO',
          cantidad,
        };
      } else {
        return {
          tipoMovimiento: 'AJUSTE_NEGATIVO',
          cantidad,
        };
      }
    }

    throw new DomainError(`Tipo de movimiento no soportado: ${tipoMovimiento}`, 'TIPO_MOVIMIENTO_INVALIDO', 400);
  }
}
