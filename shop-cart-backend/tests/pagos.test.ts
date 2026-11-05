import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DomainError } from '@/core/domain/domain.error';
import { ConfirmOrderCommandHandler } from '@/features/checkout/commands/confirm-order.command';
import { ReconcilePaymentsCommandHandler } from '@/features/checkout/commands/reconcile-payments.command';
import { ConfirmOrderSchema, ListPaymentsSchema } from '@/features/checkout/models/checkout.schema';
import { PasarelaTimeoutError } from '@/features/checkout/abstracts/payment-gateway.interface';
import { ConfirmOrderResult } from '@/features/checkout/models/checkout.model';
import { IntentoPendienteDTO } from '@/features/checkout/models/payments.model';
import { SimulatedPaymentGateway } from '@/features/checkout/infrastructure/simulated-payment.gateway';
import {
  FakeGateway,
  FakePaymentsRepo,
  FakePublisher,
  fakeCheckoutRepo,
  pedidoNuevo,
} from './fakes';

const cmd = {
  idCarrito: 1,
  idDireccion: 2,
  claveIdempotencia: 'CLAVE-PAGO-0001',
  simularFalloPago: false,
  idUsuario: 9,
};

function armar(confirmOrder: () => Promise<ConfirmOrderResult> = async () => pedidoNuevo()) {
  const payments = new FakePaymentsRepo();
  const gateway = new FakeGateway();
  const events = new FakePublisher();
  let creaciones = 0;
  const repo = fakeCheckoutRepo(async () => {
    creaciones++;
    return confirmOrder();
  });
  const handler = new ConfirmOrderCommandHandler(repo, payments, gateway, events);
  return { payments, gateway, events, handler, creaciones: () => creaciones };
}

describe('ConfirmOrderCommandHandler con pasarela de pago', () => {
  it('aprobado: autoriza, crea el pedido, captura y publica NUEVO_PEDIDO', async () => {
    const { payments, gateway, events, handler } = armar();
    const res = await handler.handle(cmd);

    assert.equal(res.IDPedido, 77);
    assert.deepEqual(gateway.llamadas, ['autorizar', 'capturar:REF-1']);
    assert.equal(payments.registrados[0]!.estado, 'AUTORIZADO');
    assert.deepEqual(payments.actualizaciones, [{ id: 1, estado: 'CAPTURADO', idPedido: 77 }]);
    assert.deepEqual(events.eventos, [{ tipo: 'NUEVO_PEDIDO', payload: { idPedido: 77 } }]);
  });

  it('rechazado: registra RECHAZADO, responde 402 PAGO_RECHAZADO y no crea el pedido', async () => {
    const { payments, gateway, handler, creaciones } = armar();
    gateway.autorizacion = { aprobado: false, referencia: null, motivo: 'Tarjeta rechazada' };

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.code === 'PAGO_RECHAZADO' && err.httpStatus === 402,
    );
    assert.equal(payments.registrados[0]!.estado, 'RECHAZADO');
    assert.equal(creaciones(), 0);
    assert.deepEqual(gateway.llamadas, ['autorizar']);
  });

  it('simularFalloPago se traduce en una simulación RECHAZADO', async () => {
    const { gateway, handler } = armar();
    gateway.autorizacion = { aprobado: false, referencia: null };
    await assert.rejects(() => handler.handle({ ...cmd, simularFalloPago: true }));
    assert.equal(gateway.ultimaAutorizacion?.simulacion, 'RECHAZADO');
  });

  it('error de negocio tras autorizar: anula el cobro, marca ANULADO y relanza el error original', async () => {
    const original = new DomainError('Sin stock', 'INSUFFICIENT_STOCK', 409);
    const { payments, gateway, events, handler } = armar(async () => {
      throw original;
    });

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err === original,
    );
    assert.deepEqual(gateway.llamadas, ['autorizar', 'anular:REF-1']);
    assert.deepEqual(payments.actualizaciones, [{ id: 1, estado: 'ANULADO', idPedido: undefined }]);
    assert.equal(events.eventos.length, 0);
  });

  it('error SQL de negocio (número >= 50000) también compensa con anulación', async () => {
    const sqlError = Object.assign(new Error('Última unidad'), { number: 50063 });
    const { payments, gateway, handler } = armar(async () => {
      throw sqlError;
    });
    await assert.rejects(() => handler.handle(cmd), (err: unknown) => err === sqlError);
    assert.equal(gateway.llamadas.includes('anular:REF-1'), true);
    assert.equal(payments.actualizaciones[0]!.estado, 'ANULADO');
  });

  it('ERROR_TRAS_COBRO: autoriza, falla la creación forzada y compensa', async () => {
    const { payments, gateway, handler, creaciones } = armar();
    gateway.autorizacion = { aprobado: true, referencia: 'REF-1', fallaPostCobro: true };

    await assert.rejects(
      () => handler.handle({ ...cmd, simulacionPago: 'ERROR_TRAS_COBRO' }),
      (err: unknown) => err instanceof DomainError && err.code === 'PAGO_REVERTIDO',
    );
    assert.equal(creaciones(), 0);
    assert.equal(payments.actualizaciones[0]!.estado, 'ANULADO');
    assert.deepEqual(gateway.llamadas, ['autorizar', 'anular:REF-1']);
  });

  it('error de infraestructura tras autorizar: PENDIENTE_CONCILIACION y 503, sin anular', async () => {
    const { payments, gateway, handler } = armar(async () => {
      throw Object.assign(new Error('Connection lost'), { code: 'ECONNCLOSED' });
    });

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.code === 'PAGO_EN_CONCILIACION' && err.httpStatus === 503,
    );
    assert.equal(payments.actualizaciones[0]!.estado, 'PENDIENTE_CONCILIACION');
    assert.equal(gateway.llamadas.some(l => l.startsWith('anular')), false);
  });

  it('timeout de la pasarela: registra PENDIENTE_CONCILIACION y responde 503', async () => {
    const { payments, gateway, handler, creaciones } = armar();
    gateway.autorizacion = new PasarelaTimeoutError('timeout', 'REF-T');

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.code === 'PAGO_EN_CONCILIACION',
    );
    assert.equal(payments.registrados[0]!.estado, 'PENDIENTE_CONCILIACION');
    assert.equal(payments.registrados[0]!.referencia, 'REF-T');
    assert.equal(creaciones(), 0);
  });

  it('monto del pedido distinto al autorizado: no captura y deja PENDIENTE_CONCILIACION', async () => {
    const { payments, gateway, events, handler } = armar(async () => ({ IDPedido: 77, FueIdempotente: 0, Total: 150 }));
    const res = await handler.handle(cmd);

    assert.equal(res.IDPedido, 77);
    assert.deepEqual(gateway.llamadas, ['autorizar']);
    assert.deepEqual(payments.actualizaciones, [{ id: 1, estado: 'PENDIENTE_CONCILIACION', idPedido: 77 }]);
    assert.equal(events.eventos.length, 1);
  });

  it('reintento idempotente con pedido existente: no autoriza ni registra intentos', async () => {
    const { payments, gateway, events, handler } = armar(async () => ({ IDPedido: 77, FueIdempotente: 1 }));
    payments.contexto = { IDPedidoExistente: 77, MontoTotal: 100, EstadoIntentoActivo: null, ClaveEnUsoPorOtro: false, ReservaVencida: false };

    const res = await handler.handle(cmd);
    assert.equal(res.FueIdempotente, 1);
    assert.deepEqual(gateway.llamadas, []);
    assert.equal(payments.registrados.length, 0);
    assert.equal(events.eventos.length, 0);
  });

  it('clave de otro usuario: 409 CLAVE_IDEMPOTENCIA_EN_USO sin autorizar ni registrar intentos', async () => {
    const { payments, gateway, handler, creaciones } = armar();
    payments.contexto = { ...payments.contexto, ClaveEnUsoPorOtro: true };

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.code === 'CLAVE_IDEMPOTENCIA_EN_USO' && err.httpStatus === 409,
    );
    assert.deepEqual(gateway.llamadas, []);
    assert.equal(payments.registrados.length, 0);
    assert.equal(creaciones(), 0);
  });

  it('violación de la llave única tras autorizar: anula el cobro y no deja conciliación', async () => {
    const duplicado = Object.assign(new Error('Violation of UNIQUE KEY constraint UQ_Pedidos_Idempotencia'), { number: 2627 });
    const { payments, gateway, handler } = armar(async () => {
      throw duplicado;
    });
    await assert.rejects(() => handler.handle(cmd), (err: unknown) => err === duplicado);
    assert.equal(gateway.llamadas.includes('anular:REF-1'), true);
    assert.equal(payments.actualizaciones[0]!.estado, 'ANULADO');
  });

  it('reserva vencida: 409 RESERVA_VENCIDA sin autorizar el cobro', async () => {
    const { payments, gateway, handler, creaciones } = armar();
    payments.contexto = { ...payments.contexto, ReservaVencida: true };

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.code === 'RESERVA_VENCIDA' && err.httpStatus === 409,
    );
    assert.deepEqual(gateway.llamadas, []);
    assert.equal(creaciones(), 0);
  });

  it('reintento mientras el pago está en conciliación: 503 sin volver a autorizar', async () => {
    const { payments, gateway, handler } = armar();
    payments.contexto = { IDPedidoExistente: null, MontoTotal: 100, EstadoIntentoActivo: 'PENDIENTE_CONCILIACION', ClaveEnUsoPorOtro: false, ReservaVencida: false };

    await assert.rejects(
      () => handler.handle(cmd),
      (err: unknown) => err instanceof DomainError && err.code === 'PAGO_EN_CONCILIACION',
    );
    assert.deepEqual(gateway.llamadas, []);
  });

  it('carrera idempotente: si el pedido ya existía tras autorizar, anula el cobro duplicado', async () => {
    const { payments, gateway, events, handler } = armar(async () => ({ IDPedido: 77, FueIdempotente: 1 }));
    const res = await handler.handle(cmd);

    assert.equal(res.FueIdempotente, 1);
    assert.deepEqual(gateway.llamadas, ['autorizar', 'anular:REF-1']);
    assert.equal(payments.actualizaciones[0]!.estado, 'ANULADO');
    assert.equal(events.eventos.length, 0);
  });
});

describe('ReconcilePaymentsCommandHandler', () => {
  const base: IntentoPendienteDTO = {
    IDIntentoPago: 5,
    IDUsuario: 9,
    ClaveIdempotencia: 'CLAVE-PAGO-0001',
    Monto: 100,
    Estado: 'PENDIENTE_CONCILIACION',
    ReferenciaPasarela: 'REF-5',
    FechaCreacion: new Date(),
    MinutosAntiguedad: 1,
    IDPedidoExistente: null,
    TotalPedido: null,
  };

  it('captura el pago cuando el pedido existe', async () => {
    const payments = new FakePaymentsRepo();
    const gateway = new FakeGateway();
    payments.pendientes = [{ ...base, IDPedidoExistente: 40, TotalPedido: 100 }];

    const res = await new ReconcilePaymentsCommandHandler(payments, gateway, 15).handle();
    assert.deepEqual(res, { capturados: 1, anulados: 0, pendientes: 0 });
    assert.deepEqual(gateway.llamadas, ['capturar:REF-5']);
    assert.deepEqual(payments.actualizaciones, [{ id: 5, estado: 'CAPTURADO', idPedido: 40 }]);
  });

  it('anula el pago sin pedido cuando superó el TTL de la reserva', async () => {
    const payments = new FakePaymentsRepo();
    const gateway = new FakeGateway();
    payments.pendientes = [{ ...base, MinutosAntiguedad: 20 }];

    const res = await new ReconcilePaymentsCommandHandler(payments, gateway, 15).handle();
    assert.deepEqual(res, { capturados: 0, anulados: 1, pendientes: 0 });
    assert.deepEqual(gateway.llamadas, ['anular:REF-5']);
    assert.equal(payments.actualizaciones[0]!.estado, 'ANULADO');
  });

  it('deja pendiente un intento reciente sin pedido', async () => {
    const payments = new FakePaymentsRepo();
    const gateway = new FakeGateway();
    payments.pendientes = [{ ...base, MinutosAntiguedad: 3 }];

    const res = await new ReconcilePaymentsCommandHandler(payments, gateway, 15).handle();
    assert.deepEqual(res, { capturados: 0, anulados: 0, pendientes: 1 });
    assert.deepEqual(gateway.llamadas, []);
    assert.equal(payments.actualizaciones.length, 0);
  });
});

describe('Esquemas de pagos y pasarela simulada', () => {
  it('ConfirmOrderSchema acepta simulacionPago opcional y rechaza valores desconocidos', () => {
    const base = { idCarrito: 1, idDireccion: 1, claveIdempotencia: 'CLAVE-PAGO-0001' };
    assert.equal(ConfirmOrderSchema.parse(base).simulacionPago, undefined);
    assert.equal(ConfirmOrderSchema.parse({ ...base, simulacionPago: 'TIMEOUT' }).simulacionPago, 'TIMEOUT');
    assert.equal(ConfirmOrderSchema.safeParse({ ...base, simulacionPago: 'OTRO' }).success, false);
  });

  it('ListPaymentsSchema aplica paginación por defecto y valida el estado', () => {
    const q = ListPaymentsSchema.parse({});
    assert.deepEqual([q.pagina, q.tamanoPagina, q.direccion], [1, 15, 'desc']);
    assert.equal(ListPaymentsSchema.parse({ estado: 'ANULADO' }).estado, 'ANULADO');
    assert.equal(ListPaymentsSchema.safeParse({ estado: 'X' }).success, false);
  });

  it('la pasarela simulada es determinista y respeta la simulación', async () => {
    const gw = new SimulatedPaymentGateway();
    const a = await gw.autorizar({ clave: 'K', monto: 10, idUsuario: 1 });
    const b = await gw.autorizar({ clave: 'K', monto: 10, idUsuario: 1 });
    assert.equal(a.aprobado, true);
    assert.equal(a.referencia, b.referencia);
    assert.equal((await gw.autorizar({ clave: 'K', monto: 10, idUsuario: 1, simulacion: 'RECHAZADO' })).aprobado, false);
    assert.equal((await gw.autorizar({ clave: 'K', monto: 10, idUsuario: 1, simulacion: 'ERROR_TRAS_COBRO' })).fallaPostCobro, true);
    await assert.rejects(
      () => gw.autorizar({ clave: 'K', monto: 10, idUsuario: 1, simulacion: 'TIMEOUT' }),
      PasarelaTimeoutError,
    );
  });
});
