import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ConfirmOrderCommandHandler } from '@/features/checkout/commands/confirm-order.command';
import { RedisStreamTicketStore } from '@/features/dashboard/domain/stream-ticket.store';
import { DomainError } from '@/core/domain/domain.error';
import { EstadoPago, IMetrics, NoopMetrics, ResultadoCheckout, etiquetaRuta } from '@/core/observability/metrics';
import { requestId } from '@/core/middlewares/request-id.middleware';
import { FakeGateway, FakePaymentsRepo, FakePublisher, fakeCheckoutRepo, pedidoNuevo } from './fakes';

class RegistroMetrics implements IMetrics {
  checkouts: ResultadoCheckout[] = [];
  pagos: EstadoPago[] = [];
  checkout(resultado: ResultadoCheckout) {
    this.checkouts.push(resultado);
  }
  pagoIntento(estado: EstadoPago) {
    this.pagos.push(estado);
  }
}

const cmd = { idCarrito: 1, idDireccion: 2, claveIdempotencia: 'CLAVE-PAGO-0001', simularFalloPago: false, idUsuario: 9 };

function armar(metrics: IMetrics, confirmOrder = async () => pedidoNuevo()) {
  const gateway = new FakeGateway();
  const handler = new ConfirmOrderCommandHandler(
    fakeCheckoutRepo(confirmOrder),
    new FakePaymentsRepo(),
    gateway,
    new FakePublisher(),
    metrics
  );
  return { handler, gateway };
}

describe('Etiqueta de ruta de las métricas HTTP', () => {
  it('une el prefijo montado con la plantilla de la ruta', () => {
    assert.equal(etiquetaRuta('/api/v1/pedidos', '/:id'), '/api/v1/pedidos/:id');
    assert.equal(etiquetaRuta('/api/v1/carrito', '/'), '/api/v1/carrito');
    assert.equal(etiquetaRuta('', '/health'), '/health');
    assert.equal(etiquetaRuta('', '/'), '/');
  });

  it('usa unmatched cuando no hubo ruta', () => {
    assert.equal(etiquetaRuta('', undefined), 'unmatched');
    assert.equal(etiquetaRuta('/api', /x/), 'unmatched');
  });
});

describe('Contador de checkout', () => {
  it('cuenta CONFIRMADO en un pago aprobado', async () => {
    const m = new RegistroMetrics();
    await armar(m).handler.handle(cmd);
    assert.deepEqual(m.checkouts, ['CONFIRMADO']);
  });

  it('cuenta RECHAZADO cuando la pasarela rechaza', async () => {
    const m = new RegistroMetrics();
    const { handler, gateway } = armar(m);
    gateway.autorizacion = { aprobado: false, referencia: null, motivo: 'No' };
    await assert.rejects(() => handler.handle(cmd));
    assert.deepEqual(m.checkouts, ['RECHAZADO']);
  });

  it('cuenta ANULADO e IDEMPOTENTE cuando el pedido ya existía', async () => {
    const m = new RegistroMetrics();
    await armar(m, async () => ({ ...pedidoNuevo(), FueIdempotente: 1 })).handler.handle(cmd);
    assert.deepEqual(m.checkouts, ['ANULADO', 'IDEMPOTENTE']);
  });

  it('el valor por defecto no falla en pruebas', () => {
    new NoopMetrics().checkout();
  });
});

describe('Ticket del stream sin Redis', () => {
  it('responde 503 TIEMPO_REAL_NO_DISPONIBLE', async () => {
    const roto = {
      set: async () => {
        throw new Error('caido');
      },
      getdel: async () => {
        throw new Error('caido');
      },
    };
    const store = new RedisStreamTicketStore(roto);
    const esperado = (err: unknown) =>
      err instanceof DomainError && err.code === 'TIEMPO_REAL_NO_DISPONIBLE' && err.httpStatus === 503;
    await assert.rejects(() => store.issue(), esperado);
    await assert.rejects(() => store.consume('abc'), esperado);
  });
});

describe('X-Request-Id', () => {
  function ejecutar(entrante?: string) {
    const cabeceras: Record<string, string> = {};
    const res = { locals: {} as Record<string, string>, setHeader: (k: string, v: string) => void (cabeceras[k] = v) };
    const req = { header: () => entrante };
    requestId(req as never, res as never, () => undefined);
    return { cabeceras, res };
  }

  it('reutiliza el encabezado válido', () => {
    assert.equal(ejecutar('abc-123').cabeceras['X-Request-Id'], 'abc-123');
  });

  it('genera un UUID si falta o es inválido', () => {
    assert.match(ejecutar().cabeceras['X-Request-Id'] as string, /^[0-9a-f-]{36}$/);
    assert.match(ejecutar('mal\nvalor').cabeceras['X-Request-Id'] as string, /^[0-9a-f-]{36}$/);
  });
});
