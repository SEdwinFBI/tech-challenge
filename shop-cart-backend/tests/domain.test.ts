import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function expectDomainError(err: unknown, expectedCode: string, expectedStatus?: number): boolean {
  if (!(err instanceof DomainError)) return false;
  assert.equal(err.code, expectedCode);
  if (expectedStatus !== undefined) {
    assert.equal(err.httpStatus, expectedStatus);
  }
  return true;
}

import { Money } from '@/core/domain/money.vo';
import { DomainError } from '@/core/domain/domain.error';
import { AuthUser } from '@/core/middlewares/auth.middleware';
import { OrderStatePolicy, OrderStatus } from '@/features/pedidos/domain/order-state.machine';
import { InventoryMovementPolicy, MovementTypeInput } from '@/features/inventario/domain/movement.policy';
import { CouponPolicy } from '@/features/cupones/domain/coupon.policy';

import { RegisterSchema, LoginSchema, UpdateUserStatusSchema } from '@/features/auth/models/auth.schema';
import { UpdateOrderStatusSchema, ReturnOrderLineSchema, GetOrdersSchema } from '@/features/pedidos/models/pedidos.schema';
import { ConfirmOrderSchema, CreateAddressSchema, ReserveStockSchema, SetDefaultAddressSchema } from '@/features/checkout/models/checkout.schema';
import { SaveCouponSchema, ApplyCouponSchema } from '@/features/cupones/models/cupones.schema';
import { CreateMovementSchema, GetKardexSchema } from '@/features/inventario/models/inventario.schema';
import { UpsertCartItemSchema } from '@/features/carrito/models/carrito.schema';
import { CreateProductSchema, CreateVariantSchema, UpdatePriceSchema } from '@/features/catalogo/models/catalogo.schema';

import { UpdateOrderStatusCommandHandler } from '@/features/pedidos/commands/update-order-status.command';
import { GetOrderByIdQueryHandler } from '@/features/pedidos/queries/get-order-by-id.query';
import { IOrdersRepository } from '@/features/pedidos/abstracts/pedidos.repository.interface';
import { OrderAggregate } from '@/features/pedidos/models/pedidos.model';
import { ConfirmOrderCommandHandler } from '@/features/checkout/commands/confirm-order.command';
import { ICheckoutRepository } from '@/features/checkout/abstracts/checkout.repository.interface';
import { ConfirmOrderResult } from '@/features/checkout/models/checkout.model';
import { FakeGateway, FakePaymentsRepo, FakePublisher } from './fakes';
import { GetDashboardSummaryQueryHandler } from '@/features/dashboard/queries/get-dashboard-summary.query';
import { IDashboardRepository } from '@/features/dashboard/abstracts/dashboard.repository.interface';

describe('Value Object Money', () => {
  it('instancia Money con decimales positivos', () => {
    const m1 = Money.fromDecimal(19.99);
    assert.equal(m1.value, 19.99);

    const m2 = Money.fromDecimal(0);
    assert.equal(m2.value, 0);

    const m3 = Money.fromDecimal(650.0);
    assert.equal(m3.value, 650.0);
  });

  it('redondea centavos sin error de punto flotante', () => {
    const suma = Money.fromDecimal(0.1).add(Money.fromDecimal(0.2));
    assert.equal(suma.value, 0.3);

    const redondeoArriba = Money.fromDecimal(10.005);
    assert.equal(redondeoArriba.value, 10.01);

    const redondeoAbajo = Money.fromDecimal(10.004);
    assert.equal(redondeoAbajo.value, 10.0);

    const m1 = Money.fromDecimal(19.99);
    const m2 = Money.fromDecimal(5.99);
    assert.equal(m1.add(m2).value, 25.98);
  });

  it('rechaza montos negativos con MONTO_NEGATIVO (400)', () => {
    assert.throws(
      () => Money.fromDecimal(-0.01),
      (err: unknown) => expectDomainError(err, 'MONTO_NEGATIVO', 400)
    );

    assert.throws(
      () => Money.fromDecimal(-100),
      (err: unknown) => expectDomainError(err, 'MONTO_NEGATIVO')
    );
  });

  it('debe sumar montos preservando el valor original', () => {
    const original = Money.fromDecimal(50.25);
    const suma = original.add(Money.fromDecimal(49.75));

    assert.equal(original.value, 50.25, 'El valor original debe mantenerse igual');
    assert.equal(suma.value, 100.0);
  });

  it('debe restar montos con tope en 0 para evitar totales negativos por descuento', () => {
    const base = Money.fromDecimal(50.0);
    const descuentoMenor = Money.fromDecimal(20.0);
    assert.equal(base.subtract(descuentoMenor).value, 30.0);

    const descuentoExacto = Money.fromDecimal(50.0);
    assert.equal(base.subtract(descuentoExacto).value, 0.0);

    const superDescuento = Money.fromDecimal(80.0);
    const resultado = base.subtract(superDescuento);
    assert.equal(resultado.value, 0.0, 'El monto nunca debe descender de cero');
  });

  it('calcula el monto neto e IVA del 12%', () => {
    const totalConIva = Money.fromDecimal(112.0);
    assert.equal(totalConIva.netAmount, 100.0);
    assert.equal(totalConIva.iva, 12.0);
    assert.equal(Number((totalConIva.netAmount + totalConIva.iva).toFixed(2)), 112.0);

    const m56 = Money.fromDecimal(56.0);
    assert.equal(m56.netAmount, 50.0);
    assert.equal(m56.iva, 6.0);

    const m0 = Money.fromDecimal(0);
    assert.equal(m0.netAmount, 0);
    assert.equal(m0.iva, 0);
  });
});

describe('OrderStatePolicy - Máquina de Estados', () => {
  it('permite las transiciones válidas para OPERADOR y ADMINISTRADOR', () => {
    assert.doesNotThrow(() => {
      OrderStatePolicy.ensureValidTransition('PAGADO', 'EN_PREPARACION', 'OPERADOR');
      OrderStatePolicy.ensureValidTransition('EN_PREPARACION', 'DESPACHADO', 'OPERADOR');
      OrderStatePolicy.ensureValidTransition('DESPACHADO', 'ENTREGADO', 'OPERADOR');
      OrderStatePolicy.ensureValidTransition('ENTREGADO', 'DEVUELTO_PARCIAL', 'OPERADOR');
      OrderStatePolicy.ensureValidTransition('DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL', 'OPERADOR');
    });

    assert.doesNotThrow(() => {
      OrderStatePolicy.ensureValidTransition('PAGADO', 'CANCELADO', 'ADMINISTRADOR');
      OrderStatePolicy.ensureValidTransition('EN_PREPARACION', 'CANCELADO', 'ADMINISTRADOR');
    });
  });

  it('debe bloquear transiciones no permitidas arrojando DomainError INVALID_STATE_TRANSITION (409)', () => {
    const invalidTransitions: Array<[OrderStatus, OrderStatus]> = [
      ['PAGADO', 'DESPACHADO'],
      ['PAGADO', 'ENTREGADO'],
      ['PAGADO', 'DEVUELTO_TOTAL'],
      ['EN_PREPARACION', 'ENTREGADO'],
      ['DESPACHADO', 'CANCELADO'],
      ['DESPACHADO', 'EN_PREPARACION'],
      ['ENTREGADO', 'CANCELADO'],
      ['ENTREGADO', 'PAGADO'],
      ['CANCELADO', 'PAGADO'],
      ['CANCELADO', 'EN_PREPARACION'],
      ['DEVUELTO_TOTAL', 'ENTREGADO'],
      ['DEVUELTO_TOTAL', 'PAGADO'],
      ['DEVUELTO_PARCIAL', 'DEVUELTO_PARCIAL'],
    ];

    for (const [origen, destino] of invalidTransitions) {
      assert.throws(
        () => OrderStatePolicy.ensureValidTransition(origen, destino, 'ADMINISTRADOR'),
        (err: unknown) => expectDomainError(err, 'INVALID_STATE_TRANSITION', 409),
        `Debería fallar la transición de ${origen} a ${destino}`
      );
    }
  });

  it('debe restringir el rol CLIENTE únicamente a CANCELADO en pedidos no despachados (403)', () => {
    assert.doesNotThrow(() => {
      OrderStatePolicy.ensureValidTransition('PAGADO', 'CANCELADO', 'CLIENTE');
    });

    assert.doesNotThrow(() => {
      OrderStatePolicy.ensureValidTransition('EN_PREPARACION', 'CANCELADO', 'CLIENTE');
    });

    assert.throws(
      () => OrderStatePolicy.ensureValidTransition('PAGADO', 'EN_PREPARACION', 'CLIENTE'),
      (err: unknown) => expectDomainError(err, 'FORBIDDEN_STATE', 403)
    );

    assert.throws(
      () => OrderStatePolicy.ensureValidTransition('EN_PREPARACION', 'DESPACHADO', 'CLIENTE'),
      (err: unknown) => expectDomainError(err, 'FORBIDDEN_STATE', 403)
    );

    assert.throws(
      () => OrderStatePolicy.ensureValidTransition('DESPACHADO', 'CANCELADO', 'CLIENTE'),
      (err: unknown) => expectDomainError(err, 'INVALID_STATE_TRANSITION', 409)
    );
  });
});

describe('InventoryMovementPolicy - Kardex y Ajustes', () => {
  it('debe normalizar automáticamente AJUSTE a AJUSTE_POSITIVO cuando cantidad > 0', () => {
    const res = InventoryMovementPolicy.validateAndNormalize('AJUSTE', 25);
    assert.deepEqual(res, {
      tipoMovimiento: 'AJUSTE_POSITIVO',
      cantidad: 25,
    });
  });

  it('debe normalizar automáticamente AJUSTE a AJUSTE_NEGATIVO cuando cantidad < 0', () => {
    const res = InventoryMovementPolicy.validateAndNormalize('AJUSTE', -12);
    assert.deepEqual(res, {
      tipoMovimiento: 'AJUSTE_NEGATIVO',
      cantidad: -12,
    });
  });

  it('debe convertir siempre AJUSTE_NEGATIVO a una cantidad negativa sin importar el signo de entrada', () => {
    const resPositivo = InventoryMovementPolicy.validateAndNormalize('AJUSTE_NEGATIVO', 5);
    assert.deepEqual(resPositivo, {
      tipoMovimiento: 'AJUSTE_NEGATIVO',
      cantidad: -5,
    });

    const resNegativo = InventoryMovementPolicy.validateAndNormalize('AJUSTE_NEGATIVO', -15);
    assert.deepEqual(resNegativo, {
      tipoMovimiento: 'AJUSTE_NEGATIVO',
      cantidad: -15,
    });
  });

  it('debe validar y retornar ENTRADA_COMPRA y AJUSTE_POSITIVO con cantidades positivas', () => {
    const entrada = InventoryMovementPolicy.validateAndNormalize('ENTRADA_COMPRA', 50);
    assert.deepEqual(entrada, {
      tipoMovimiento: 'ENTRADA_COMPRA',
      cantidad: 50,
    });

    const ajustePos = InventoryMovementPolicy.validateAndNormalize('AJUSTE_POSITIVO', 8);
    assert.deepEqual(ajustePos, {
      tipoMovimiento: 'AJUSTE_POSITIVO',
      cantidad: 8,
    });
  });

  it('debe rechazar cantidad 0 en cualquier movimiento con CANTIDAD_INVALIDA (400)', () => {
    const tipos: MovementTypeInput[] = ['ENTRADA_COMPRA', 'AJUSTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'];
    for (const tipo of tipos) {
      assert.throws(
        () => InventoryMovementPolicy.validateAndNormalize(tipo, 0),
        (err: unknown) => expectDomainError(err, 'CANTIDAD_INVALIDA', 400)
      );
    }
  });

  it('debe rechazar cantidades negativas o cero para ENTRADA_COMPRA y AJUSTE_POSITIVO', () => {
    assert.throws(
      () => InventoryMovementPolicy.validateAndNormalize('ENTRADA_COMPRA', -10),
      (err: unknown) => expectDomainError(err, 'CANTIDAD_INVALIDA')
    );

    assert.throws(
      () => InventoryMovementPolicy.validateAndNormalize('AJUSTE_POSITIVO', -3),
      (err: unknown) => expectDomainError(err, 'CANTIDAD_INVALIDA')
    );
  });

  it('debe rechazar tipos de movimiento no soportados', () => {
    assert.throws(
      () => InventoryMovementPolicy.validateAndNormalize('SALIDA_EXTRA' as MovementTypeInput, 10),
      (err: unknown) => expectDomainError(err, 'TIPO_MOVIMIENTO_INVALIDO')
    );
  });
});

describe('CouponPolicy - Reglas de Promociones', () => {
  const ahora = new Date('2026-11-01T00:00:00Z');
  const manana = new Date('2026-11-02T00:00:00Z');
  const ayer = new Date('2026-10-31T00:00:00Z');

  it('debe validar exitosamente un cupón de porcentaje válido', () => {
    assert.doesNotThrow(() => {
      CouponPolicy.validateCreationRules({
        tipoDescuento: 'PORCENTAJE',
        valor: 20,
        montoMinimoCompra: 100,
        fechaInicio: ahora,
        fechaFin: manana,
      });
    });
  });

  it('debe validar exitosamente un cupón de monto fijo válido', () => {
    assert.doesNotThrow(() => {
      CouponPolicy.validateCreationRules({
        tipoDescuento: 'MONTO_FIJO',
        valor: 50.0,
        montoMinimoCompra: 200.0,
        fechaInicio: ahora,
        fechaFin: manana,
      });
    });
  });

  it('debe rechazar cupones donde fechaFin <= fechaInicio con CUPON_FECHAS_INVALIDAS (400)', () => {
    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'PORCENTAJE',
          valor: 15,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: ayer,
        }),
      (err: unknown) => expectDomainError(err, 'CUPON_FECHAS_INVALIDAS', 400)
    );

    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'PORCENTAJE',
          valor: 15,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: ahora,
        }),
      (err: unknown) => expectDomainError(err, 'CUPON_FECHAS_INVALIDAS')
    );
  });

  it('debe validar el tope de porcentaje entre > 0 y <= 100% (PORCENTAJE_INVALIDO)', () => {
    assert.doesNotThrow(() => {
      CouponPolicy.validateCreationRules({
        tipoDescuento: 'PORCENTAJE',
        valor: 100,
        montoMinimoCompra: 0,
        fechaInicio: ahora,
        fechaFin: manana,
      });
    });

    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'PORCENTAJE',
          valor: 0,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: manana,
        }),
      (err: unknown) => expectDomainError(err, 'PORCENTAJE_INVALIDO')
    );

    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'PORCENTAJE',
          valor: 100.5,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: manana,
        }),
      (err: unknown) => expectDomainError(err, 'PORCENTAJE_INVALIDO')
    );

    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'PORCENTAJE',
          valor: -5,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: manana,
        }),
      (err: unknown) => expectDomainError(err, 'PORCENTAJE_INVALIDO')
    );
  });

  it('debe rechazar montos fijos menores o iguales a cero con MONTO_DESCUENTO_INVALIDO', () => {
    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'MONTO_FIJO',
          valor: 0,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: manana,
        }),
      (err: unknown) => expectDomainError(err, 'MONTO_DESCUENTO_INVALIDO')
    );

    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'MONTO_FIJO',
          valor: -25,
          montoMinimoCompra: 0,
          fechaInicio: ahora,
          fechaFin: manana,
        }),
      (err: unknown) => expectDomainError(err, 'MONTO_DESCUENTO_INVALIDO')
    );
  });

  it('debe rechazar monto mínimo de compra negativo con MONTO_MINIMO_INVALIDO', () => {
    assert.throws(
      () =>
        CouponPolicy.validateCreationRules({
          tipoDescuento: 'PORCENTAJE',
          valor: 10,
          montoMinimoCompra: -50,
          fechaInicio: ahora,
          fechaFin: manana,
        }),
      (err: unknown) => expectDomainError(err, 'MONTO_MINIMO_INVALIDO')
    );
  });
});

describe('Validación de Esquemas Zod', () => {
  describe('Auth Schemas (auth.schema.ts)', () => {
    it('RegisterSchema: valida usuario correcto y rechaza correo inválido o password menor a 8 chars', () => {
      const valido = RegisterSchema.safeParse({
        correo: 'juan.perez@gmail.com',
        password: 'PasswordSegura2026!',
        nombreCompleto: 'Juan Pérez',
      });
      assert.equal(valido.success, true);

      const correoInvalido = RegisterSchema.safeParse({
        correo: 'juan-sin-arroba',
        password: 'PasswordSegura2026!',
        nombreCompleto: 'Juan Pérez',
      });
      assert.equal(correoInvalido.success, false);

      const passwordCorta = RegisterSchema.safeParse({
        correo: 'juan.perez@gmail.com',
        password: '12345',
        nombreCompleto: 'Juan Pérez',
      });
      assert.equal(passwordCorta.success, false);

      const nombreCorto = RegisterSchema.safeParse({
        correo: 'juan.perez@gmail.com',
        password: 'PasswordSegura2026!',
        nombreCompleto: 'Jo',
      });
      assert.equal(nombreCorto.success, false);
    });

    it('LoginSchema y UpdateUserStatusSchema: validaciones esperadas', () => {
      const loginValido = LoginSchema.safeParse({
        correo: 'admin@gmail.com',
        password: 'Password123!',
      });
      assert.equal(loginValido.success, true);

      const loginInvalido = LoginSchema.safeParse({
        correo: 'admin@gmail.com',
        password: '',
      });
      assert.equal(loginInvalido.success, false);

      const cambiarEstado = UpdateUserStatusSchema.safeParse({ activo: false });
      assert.equal(cambiarEstado.success, true);
    });
  });

  describe('Pedidos Schemas (pedidos.schema.ts)', () => {
    it('UpdateOrderStatusSchema: valida estados permitidos y rechaza desconocidos', () => {
      const valido = UpdateOrderStatusSchema.safeParse({
        idPedido: 42,
        nuevoEstado: 'DESPACHADO',
        comentario: 'Guía de rastreo CargoExpress #987654',
      });
      assert.equal(valido.success, true);

      const sinMotivo = UpdateOrderStatusSchema.safeParse({ idPedido: 42, nuevoEstado: 'CANCELADO' });
      assert.equal(sinMotivo.success, false);
      const motivoCorto = UpdateOrderStatusSchema.safeParse({ idPedido: 42, nuevoEstado: 'CANCELADO', comentario: ' abc ' });
      assert.equal(motivoCorto.success, false);
      const motivoLargo = UpdateOrderStatusSchema.safeParse({ idPedido: 42, nuevoEstado: 'CANCELADO', comentario: 'x'.repeat(301) });
      assert.equal(motivoLargo.success, false);
      const motivoValido = UpdateOrderStatusSchema.safeParse({ idPedido: 42, nuevoEstado: 'CANCELADO', comentario: 'Cliente sin stock' });
      assert.equal(motivoValido.success, true);
      const sinMotivoOtroEstado = UpdateOrderStatusSchema.safeParse({ idPedido: 42, nuevoEstado: 'DESPACHADO' });
      assert.equal(sinMotivoOtroEstado.success, true);

      const estadoInvalido = UpdateOrderStatusSchema.safeParse({
        idPedido: 42,
        nuevoEstado: 'EN_RUTA_A_DESTINO',
      });
      assert.equal(estadoInvalido.success, false);

      const idInvalido = UpdateOrderStatusSchema.safeParse({
        idPedido: -1,
        nuevoEstado: 'ENTREGADO',
      });
      assert.equal(idInvalido.success, false);
    });

    it('ReturnOrderLineSchema y GetOrdersSchema: validaciones esperadas', () => {
      const devValida = ReturnOrderLineSchema.safeParse({
        idPedido: 10,
        idPedidoDetalle: 25,
        cantidadADevolver: 2,
        motivo: 'Talla no adecuada según especificación',
      });
      assert.equal(devValida.success, true);

      const devMotivoCorto = ReturnOrderLineSchema.safeParse({
        idPedido: 10,
        idPedidoDetalle: 25,
        cantidadADevolver: 2,
        motivo: 'No',
      });
      assert.equal(devMotivoCorto.success, false);

      const devCantidadCero = ReturnOrderLineSchema.safeParse({
        idPedido: 10,
        idPedidoDetalle: 25,
        cantidadADevolver: 0,
        motivo: 'Defectuoso de fábrica',
      });
      assert.equal(devCantidadCero.success, false);

      const lista = GetOrdersSchema.safeParse({
        pagina: '2',
        tamanoPagina: '20',
        idCliente: '5',
      });
      assert.equal(lista.success, true);
      if (lista.success) {
        assert.equal(lista.data.pagina, 2);
        assert.equal(lista.data.tamanoPagina, 20);
        assert.equal(lista.data.idCliente, 5);
      }
    });
  });

  describe('Checkout Schemas (checkout.schema.ts)', () => {
    it('ConfirmOrderSchema: valida clave de idempotencia y IDs positivos', () => {
      const valido = ConfirmOrderSchema.safeParse({
        idCarrito: 1,
        idDireccion: 3,
        claveIdempotencia: 'IDEMP-7a1b-4f92-9901-bbf2930219aa',
        simularFalloPago: false,
      });
      assert.equal(valido.success, true);

      const claveCorta = ConfirmOrderSchema.safeParse({
        idCarrito: 1,
        idDireccion: 3,
        claveIdempotencia: 'CORTA',
      });
      assert.equal(claveCorta.success, false);

      const idCero = ConfirmOrderSchema.safeParse({
        idCarrito: 0,
        idDireccion: 3,
        claveIdempotencia: 'IDEMP-VALIDA-12345',
      });
      assert.equal(idCero.success, false);
    });

    it('SetDefaultAddressSchema: el id debe ser entero positivo', () => {
      assert.equal(SetDefaultAddressSchema.parse({ idDireccion: '7' }).idDireccion, 7);
      assert.equal(SetDefaultAddressSchema.safeParse({ idDireccion: 'abc' }).success, false);
      assert.equal(SetDefaultAddressSchema.safeParse({ idDireccion: 0 }).success, false);
      assert.equal(CreateAddressSchema.parse({ etiqueta: 'Casa', idMunicipio: 1, direccionExacta: 'Zona 1 casa 2', telefonoContacto: '55551234' }).predeterminada, false);
    });

    it('CreateAddressSchema: valida que proporcione idMunicipio o municipio', () => {
      const conIdMuni = CreateAddressSchema.safeParse({
        etiqueta: 'Casa',
        idMunicipio: 101,
        direccionExacta: '10 Calle 5-20 Zona 14 Edificio Las Torres',
        telefonoContacto: '50241234567',
      });
      assert.equal(conIdMuni.success, true);

      const sinMunicipio = CreateAddressSchema.safeParse({
        etiqueta: 'Oficina',
        direccionExacta: 'Diagonal 6 Zona 10',
        telefonoContacto: '50241234567',
      });
      assert.equal(sinMunicipio.success, false, 'Debe requerir al menos idMunicipio o municipio');

      const direccionCorta = CreateAddressSchema.safeParse({
        etiqueta: 'Oficina',
        idMunicipio: 101,
        direccionExacta: 'Z10',
        telefonoContacto: '50241234567',
      });
      assert.equal(direccionCorta.success, false);
    });

    it('ReserveStockSchema: valida idCarrito entero positivo', () => {
      assert.equal(ReserveStockSchema.safeParse({ idCarrito: 5 }).success, true);
      assert.equal(ReserveStockSchema.safeParse({ idCarrito: -1 }).success, false);
    });
  });

  describe('Cupones Schemas (cupones.schema.ts)', () => {
    it('SaveCouponSchema y ApplyCouponSchema validaciones', () => {
      const cuponValido = SaveCouponSchema.safeParse({
        codigo: 'BIENVENIDO2026',
        tipoDescuento: 'PORCENTAJE',
        valor: 15,
        montoMinimoCompra: 150,
        limiteTotalUsos: 500,
        limiteUsosPorCliente: 1,
        fechaInicio: '2026-11-01T00:00:00Z',
        fechaFin: '2026-12-31T23:59:59Z',
      });
      assert.equal(cuponValido.success, true);

      const cuponCodigoCorto = SaveCouponSchema.safeParse({
        codigo: 'B',
        tipoDescuento: 'PORCENTAJE',
        valor: 15,
        limiteTotalUsos: 100,
        limiteUsosPorCliente: 1,
        fechaInicio: '2026-11-01',
        fechaFin: '2026-12-31',
      });
      assert.equal(cuponCodigoCorto.success, false);

      const aplicarValido = ApplyCouponSchema.safeParse({ codigo: 'VERANO10' });
      assert.equal(aplicarValido.success, true);

      const aplicarInvalido = ApplyCouponSchema.safeParse({ codigo: 'A' });
      assert.equal(aplicarInvalido.success, false);
    });
  });

  describe('Inventario Schemas (inventario.schema.ts)', () => {
    it('CreateMovementSchema: rechaza cantidad 0 y motivos menores a 5 caracteres', () => {
      const movimientoValido = CreateMovementSchema.safeParse({
        idVariante: 3,
        tipoMovimiento: 'ENTRADA_COMPRA',
        cantidad: 100,
        motivo: 'Recepción de embarque de proveedor internacional',
      });
      assert.equal(movimientoValido.success, true);

      const cantidadCero = CreateMovementSchema.safeParse({
        idVariante: 3,
        tipoMovimiento: 'AJUSTE',
        cantidad: 0,
        motivo: 'Corrección física',
      });
      assert.equal(cantidadCero.success, false);

      const motivoCorto = CreateMovementSchema.safeParse({
        idVariante: 3,
        tipoMovimiento: 'AJUSTE_POSITIVO',
        cantidad: 5,
        motivo: 'Fix',
      });
      assert.equal(motivoCorto.success, false);

      const listarKardex = GetKardexSchema.safeParse({ idVariante: '5', pagina: '1' });
      assert.equal(listarKardex.success, true);
    });
  });

  describe('Carrito y Catálogo Schemas (carrito.schema.ts, catalogo.schema.ts)', () => {
    it('UpsertCartItemSchema: valida variante positiva y cantidad >= 0', () => {
      assert.equal(UpsertCartItemSchema.safeParse({ idVariante: 1, cantidad: 3 }).success, true);
      assert.equal(UpsertCartItemSchema.safeParse({ idVariante: 1, cantidad: 0 }).success, true);
      assert.equal(UpsertCartItemSchema.safeParse({ idVariante: 1, cantidad: -1 }).success, false);
      assert.equal(UpsertCartItemSchema.safeParse({ idVariante: 0, cantidad: 2 }).success, false);
    });

    it('CreateProductSchema y UpdatePriceSchema: validaciones esperadas', () => {
      const prodValido = CreateProductSchema.safeParse({
        idCategoria: 1,
        nombre: 'Botín de Cuero Genuino',
        sku: 'BOT-CUE-01',
        precio: 650.0,
      });
      assert.equal(prodValido.success, true);

      const precioNegativo = CreateProductSchema.safeParse({
        idCategoria: 1,
        nombre: 'Botín',
        sku: 'BOT-CUE-01',
        precio: -10,
      });
      assert.equal(precioNegativo.success, false);

      const varValida = CreateVariantSchema.safeParse({
        sku: 'BOT-CUE-42-NEG',
        talla: '42',
        color: 'Negro',
        precio: 650.0,
        existenciaInicial: 1,
      });
      assert.equal(varValida.success, true);

      const precioAct = UpdatePriceSchema.safeParse({ nuevoPrecio: 599.99 });
      assert.equal(precioAct.success, true);
      assert.equal(UpdatePriceSchema.safeParse({ nuevoPrecio: 0 }).success, false);
    });
  });
});

describe('Handlers CQRS con repositorios mock', () => {
  describe('UpdateOrderStatusCommandHandler', () => {
    it('responde 404 cuando un CLIENTE intenta modificar el pedido de otro cliente', async () => {
      const repoMock: IOrdersRepository = {
        getById: async (idPedido: number): Promise<OrderAggregate | null> => ({
          pedido: { IDPedido: idPedido, IDUsuario: 999, Estado: 'PAGADO' },
          detalles: [],
          historial: [],
        }),
        getAllPaginated: async () => ({ items: [], totalRegistros: 0 }),
        updateStatus: async () => {},
        processLineReturn: async () => {},
      };

      const handler = new UpdateOrderStatusCommandHandler(repoMock, new FakePublisher());
      const clienteEjecutor: AuthUser = { idUsuario: 123, correo: 'cliente@gmail.com', rol: 'CLIENTE' };

      await assert.rejects(
        async () => {
          await handler.handle({
            idPedido: 1,
            nuevoEstado: 'CANCELADO',
            ejecutor: clienteEjecutor,
          });
        },
        (err: unknown) => expectDomainError(err, 'ORDER_NOT_FOUND', 404)
      );
    });

    it('debe actualizar el estado del pedido y retornar { idPedido, estado } para una transición válida', async () => {
      let updateParamsCalled: any = null;

      const repoMock: IOrdersRepository = {
        getById: async (idPedido: number): Promise<OrderAggregate | null> => ({
          pedido: { IDPedido: idPedido, IDUsuario: 10, Estado: 'PAGADO' },
          detalles: [],
          historial: [],
        }),
        getAllPaginated: async () => ({ items: [], totalRegistros: 0 }),
        updateStatus: async (params) => {
          updateParamsCalled = params;
        },
        processLineReturn: async () => {},
      };

      const handler = new UpdateOrderStatusCommandHandler(repoMock, new FakePublisher());
      const operador: AuthUser = { idUsuario: 5, correo: 'operador@gmail.com', rol: 'OPERADOR' };

      const res = await handler.handle({
        idPedido: 100,
        nuevoEstado: 'EN_PREPARACION',
        comentario: 'Preparando paquete para despacho',
        ejecutor: operador,
      });

      assert.deepEqual(res, { idPedido: 100, estado: 'EN_PREPARACION' });
      assert.notEqual(updateParamsCalled, null);
      assert.equal(updateParamsCalled.idPedido, 100);
      assert.equal(updateParamsCalled.nuevoEstado, 'EN_PREPARACION');
      assert.equal(updateParamsCalled.idUsuario, 5);
      assert.equal(updateParamsCalled.rolUsuario, 'OPERADOR');
    });
  });

  describe('GetOrderByIdQueryHandler.getSecureDetail', () => {
    it('debe arrojar DomainError ORDER_NOT_FOUND (404) cuando el pedido no existe', async () => {
      const repoMock: IOrdersRepository = {
        getById: async () => null,
        getAllPaginated: async () => ({ items: [], totalRegistros: 0 }),
        updateStatus: async () => {},
        processLineReturn: async () => {},
      };

      const handler = new GetOrderByIdQueryHandler(repoMock);
      const cliente: AuthUser = { idUsuario: 1, correo: 'cliente@gmail.com', rol: 'CLIENTE' };

      await assert.rejects(
        async () => {
          await handler.getSecureDetail(9999, cliente);
        },
        (err: unknown) => expectDomainError(err, 'ORDER_NOT_FOUND', 404)
      );
    });

    it('responde 404 cuando otro cliente intenta leer el pedido', async () => {
      const repoMock: IOrdersRepository = {
        getById: async (idPedido: number): Promise<OrderAggregate | null> => ({
          pedido: { IDPedido: idPedido, IDUsuario: 456, Estado: 'DESPACHADO' },
          detalles: [{ IDVariante: 1, Cantidad: 2, PrecioUnitario: 100 }],
          historial: [],
        }),
        getAllPaginated: async () => ({ items: [], totalRegistros: 0 }),
        updateStatus: async () => {},
        processLineReturn: async () => {},
      };

      const handler = new GetOrderByIdQueryHandler(repoMock);
      const clienteEspia: AuthUser = { idUsuario: 789, correo: 'espia@gmail.com', rol: 'CLIENTE' };

      await assert.rejects(
        async () => {
          await handler.getSecureDetail(10, clienteEspia);
        },
        (err: unknown) => expectDomainError(err, 'ORDER_NOT_FOUND', 404)
      );
    });

    it('debe permitir consultar el pedido si es el dueño legítimo o un administrador', async () => {
      const mockData: OrderAggregate = {
        pedido: { IDPedido: 10, IDUsuario: 456, Estado: 'DESPACHADO' },
        detalles: [{ IDVariante: 1, Cantidad: 2, PrecioUnitario: 100 }],
        historial: [],
      };

      const repoMock: IOrdersRepository = {
        getById: async () => mockData,
        getAllPaginated: async () => ({ items: [], totalRegistros: 0 }),
        updateStatus: async () => {},
        processLineReturn: async () => {},
      };

      const handler = new GetOrderByIdQueryHandler(repoMock);

      const clienteDuenio: AuthUser = { idUsuario: 456, correo: 'duenio@gmail.com', rol: 'CLIENTE' };
      const resCliente = await handler.getSecureDetail(10, clienteDuenio);
      assert.deepEqual(resCliente, mockData);

      const admin: AuthUser = { idUsuario: 99, correo: 'admin@gmail.com', rol: 'ADMINISTRADOR' };
      const resAdmin = await handler.getSecureDetail(10, admin);
      assert.deepEqual(resAdmin, mockData);
    });
  });

  describe('ConfirmOrderCommandHandler', () => {
    it('debe procesar pedidos nuevos (FueIdempotente = 0) exitosamente', async () => {
      let confirmParamsPassed: any = null;

      const repoMock: ICheckoutRepository = {
        getMunicipalities: async () => [],
        getAddresses: async () => [],
        createAddress: async () => [],
        deleteAddress: async () => [],
        setDefaultAddress: async () => [],
        reserveStock: async () => ({}),
        confirmOrder: async (dto) => {
          confirmParamsPassed = dto;
          return {
            IDPedido: 888,
            FueIdempotente: 0,
            Mensaje: 'Pedido formalizado exitosamente.',
          };
        },
      };

      const handler = new ConfirmOrderCommandHandler(repoMock, new FakePaymentsRepo(), new FakeGateway(), new FakePublisher());
      const resultado: ConfirmOrderResult = await handler.handle({
        idCarrito: 12,
        idDireccion: 3,
        claveIdempotencia: 'IDEMP-NEW-ORDER-2026',
        simularFalloPago: false,
        idUsuario: 10,
      });

      assert.equal(resultado.IDPedido, 888);
      assert.equal(resultado.FueIdempotente, 0);
      assert.equal(confirmParamsPassed.claveIdempotencia, 'IDEMP-NEW-ORDER-2026');
    });

    it('debe manejar solicitudes repetidas (FueIdempotente = 1) retornando el pedido existente sin duplicar cobros', async () => {
      const repoMock: ICheckoutRepository = {
        getMunicipalities: async () => [],
        getAddresses: async () => [],
        createAddress: async () => [],
        deleteAddress: async () => [],
        setDefaultAddress: async () => [],
        reserveStock: async () => ({}),
        confirmOrder: async () => ({
          IDPedido: 888,
          FueIdempotente: 1,
          Mensaje: 'Pedido formalizado previamente (respuesta idempotente).',
        }),
      };

      const handler = new ConfirmOrderCommandHandler(repoMock, new FakePaymentsRepo(), new FakeGateway(), new FakePublisher());
      const resultado: ConfirmOrderResult = await handler.handle({
        idCarrito: 12,
        idDireccion: 3,
        claveIdempotencia: 'IDEMP-NEW-ORDER-2026',
        simularFalloPago: false,
        idUsuario: 10,
      });

      assert.equal(resultado.IDPedido, 888);
      assert.equal(resultado.FueIdempotente, 1);
    });
  });

  describe('GetDashboardSummaryQueryHandler', () => {
    it('consulta el repositorio la primera vez y responde desde caché la segunda', async () => {
      let callCount = 0;

      const repoMock: IDashboardRepository = {
        getMetricsSummary: async () => {
          callCount++;
          return {
            kpis: { TotalVentas: 15000, TotalPedidos: 45 },
            top10Productos: [{ IDProducto: 1, Nombre: 'Zapato Derby' }],
            ventasPorCategoria: [{ IDCategoria: 1, Categoria: 'Calzado', Total: 15000 }],
            pedidosPorEstado: [],
            pagosPorEstado: [],
          };
        },
        getSalesByPeriod: async () => [
          { Periodo: '2026-10-01', NumeroPedidos: 2, VentasQuetzales: 5000 },
          { Periodo: '2026-10-02', NumeroPedidos: 3, VentasQuetzales: 10000 },
        ],
      };

      const handler = new GetDashboardSummaryQueryHandler(repoMock);

      const queryFija = {
        fechaInicio: new Date('2026-10-01T00:00:00Z'),
        fechaFin: new Date('2026-10-31T23:59:59Z'),
        agrupacion: 'DIA' as const,
      };

      const primerResultado: any = await handler.handle(queryFija);
      assert.equal(primerResultado.desdeCache, false);
      assert.equal(callCount, 1);
      assert.equal(primerResultado.kpis.TotalVentas, 15000);

      const segundoResultado: any = await handler.handle(queryFija);
      assert.equal(segundoResultado.desdeCache, true);
      assert.equal(callCount, 1, 'El repositorio NO debe ser invocado en la segunda llamada');
      assert.equal(segundoResultado.kpis.TotalVentas, 15000);
    });
  });
});

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { optionalAuth } from '@/core/middlewares/auth.middleware';
import { env } from '@/core/config/env';
import { AuthRepository } from '@/features/auth/repository/auth.repository';

describe('Autenticación opcional', () => {
  const invoke = async (authorization?: string, token?: string) => {
    const req = { headers: authorization === undefined ? {} : { authorization }, query: token === undefined ? {} : { token } } as Request;
    let error: unknown;
    await optionalAuth(req, {} as Response, ((err?: unknown) => { error = err; }) as NextFunction);
    return { req, error };
  };
  it('permite invitados sin credenciales', async () => {
    const result = await invoke();
    assert.equal(result.error, undefined);
    assert.equal(result.req.user, undefined);
  });
  it('rechaza tokens inválidos, expirados y cabeceras mal formadas con 401', async () => {
    const expired = jwt.sign({ idUsuario: 1, correo: 'test@example.com', rol: 'CLIENTE' }, env.JWT_ACCESS_SECRET, { expiresIn: -1 });
    for (const result of await Promise.all([invoke('Bearer invalido'), invoke(`Bearer ${expired}`), invoke('Basic invalido')])) {
      assert.ok(result.error instanceof DomainError);
      assert.equal(result.error.httpStatus, 401);
      assert.equal(result.req.user, undefined);
    }
  });
  it('conserva la identidad de un token válido', async t => {
    t.mock.method(AuthRepository.prototype, 'getById', async () => ({ IDUsuario: 1, Correo: 'test@example.com', Rol: 'CLIENTE', Activo: true }));
    const token = jwt.sign({ idUsuario: 1, correo: 'test@example.com', rol: 'CLIENTE' }, env.JWT_ACCESS_SECRET, { expiresIn: 60 });
    const result = await invoke(`Bearer ${token}`);
    assert.equal(result.error, undefined);
    assert.equal(result.req.user?.idUsuario, 1);
  });
});


describe('Regresiones de autorización y caché de auditoría', () => {
  const token = () => jwt.sign({ idUsuario: 1, correo: 'test@example.com', rol: 'ADMINISTRADOR' }, env.JWT_ACCESS_SECRET, { expiresIn: 60 });
  const invoke = async () => {
    const req = { headers: { authorization: 'Bearer ' + token() }, query: {} } as Request;
    let error: unknown;
    await optionalAuth(req, {} as Response, ((err?: unknown) => { error = err; }) as NextFunction);
    return { req, error };
  };
  it('rechaza inmediatamente al usuario desactivado, incluso con JWT vigente', async t => {
    t.mock.method(AuthRepository.prototype, 'getById', async () => ({ Activo: false, Rol: 'ADMINISTRADOR', Correo: 'test@example.com' }));
    const { req, error } = await invoke();
    assert.ok(expectDomainError(error, 'USER_INACTIVE', 403));
    assert.equal(req.user, undefined);
  });
  it('rechaza permisos antiguos después de cambiar el rol', async t => {
    t.mock.method(AuthRepository.prototype, 'getById', async () => ({ Activo: true, Rol: 'CLIENTE', Correo: 'test@example.com' }));
    const { req, error } = await invoke();
    assert.ok(expectDomainError(error, 'TOKEN_PERMISSIONS_CHANGED', 401));
    assert.equal(req.user, undefined);
  });
  it('propaga fallo SQL y no autoriza silenciosamente', async t => {
    const dbError = new Error('Sin conexión SQL');
    t.mock.method(AuthRepository.prototype, 'getById', async () => { throw dbError; });
    const { req, error } = await invoke();
    assert.equal(error, dbError);
    assert.equal(req.user, undefined);
  });
  it('distingue horas dentro del mismo día y reutiliza únicamente el rango idéntico', async () => {
    let calls = 0;
    const handler = new GetDashboardSummaryQueryHandler({
      getMetricsSummary: async (_start, end) => { calls++; return { kpis: { TotalPedidos: end.getUTCHours() }, top10Productos: [], ventasPorCategoria: [], pedidosPorEstado: [], pagosPorEstado: [] }; },
      getSalesByPeriod: async () => [],
    });
    const short = { fechaInicio: new Date('2037-11-01T00:00:00Z'), fechaFin: new Date('2037-11-01T00:01:00Z') };
    const full = { ...short, fechaFin: new Date('2037-11-01T23:59:59Z') };
    assert.equal((await handler.handle(short)).kpis?.TotalPedidos, 0);
    const result = await handler.handle(full);
    assert.equal(result.desdeCache, false);
    assert.equal(result.kpis?.TotalPedidos, 23);
    assert.equal((await handler.handle(full)).desdeCache, true);
    assert.equal(calls, 2);
  });
});
