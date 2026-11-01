import { DomainError } from '@/core/domain/domain.error';
import { Money } from '@/core/domain/money.vo';
import { ValidateCouponRulesParams } from '../models/cupones.model';

export class CouponPolicy {
  public static validateCreationRules(params: ValidateCouponRulesParams): void {
    if (params.fechaFin <= params.fechaInicio) {
      throw new DomainError('La fecha de fin debe ser posterior a la de inicio.', 'CUPON_FECHAS_INVALIDAS', 400);
    }

    if (params.tipoDescuento === 'PORCENTAJE') {
      if (params.valor <= 0 || params.valor > 100) {
        throw new DomainError('El porcentaje debe ser mayor a 0 y no pasar de 100.', 'PORCENTAJE_INVALIDO', 400);
      }
    } else if (params.tipoDescuento === 'MONTO_FIJO') {
      if (params.valor <= 0) {
        throw new DomainError('El monto de descuento debe ser mayor a 0.', 'MONTO_DESCUENTO_INVALIDO', 400);
      }
      Money.fromDecimal(params.valor);
    }

    if (params.montoMinimoCompra < 0) {
      throw new DomainError('El monto mínimo de compra no puede ser negativo.', 'MONTO_MINIMO_INVALIDO', 400);
    }

    Money.fromDecimal(params.montoMinimoCompra);
  }
}
