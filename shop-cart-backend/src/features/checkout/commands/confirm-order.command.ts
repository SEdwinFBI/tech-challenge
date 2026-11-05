import { ICommandHandler } from '@/core/cqrs/index';
import { DomainError } from '@/core/domain/domain.error';
import { IEventPublisher } from '@/core/events/event-publisher.interface';
import { LocalEventPublisher } from '@/core/events/local-event-publisher';
import { ICheckoutRepository } from '../abstracts/checkout.repository.interface';
import { IPaymentGateway, PasarelaTimeoutError, SimulacionPago } from '../abstracts/payment-gateway.interface';
import { IPaymentsRepository } from '../abstracts/payments.repository.interface';
import { SimulatedPaymentGateway } from '../infrastructure/simulated-payment.gateway';
import { ConfirmOrderCommand, ConfirmOrderResult } from '../models/checkout.schema';
import { CheckoutRepository } from '../repository/checkout.repository';
import { PaymentsRepository } from '../repository/payments.repository';

const esErrorDeNegocio = (err: unknown): boolean =>
  err instanceof DomainError || (typeof (err as { number?: unknown })?.number === 'number' && (err as { number: number }).number >= 50000);

const enConciliacion = () =>
  new DomainError(
    'El pago fue autorizado pero el pedido aún no se confirma. Lo estamos conciliando; no vuelvas a pagar.',
    'PAGO_EN_CONCILIACION',
    503,
  );

export class ConfirmOrderCommandHandler implements ICommandHandler<ConfirmOrderCommand, ConfirmOrderResult> {
  constructor(
    private readonly repo: ICheckoutRepository = new CheckoutRepository(),
    private readonly payments: IPaymentsRepository = new PaymentsRepository(),
    private readonly gateway: IPaymentGateway = new SimulatedPaymentGateway(),
    private readonly events: IEventPublisher = new LocalEventPublisher(),
  ) {}

  async handle(cmd: ConfirmOrderCommand): Promise<ConfirmOrderResult> {
    const contexto = await this.payments.obtenerContexto(cmd.idUsuario, cmd.idCarrito, cmd.idDireccion, cmd.claveIdempotencia);

    if (contexto.IDPedidoExistente !== null) return this.crearPedido(cmd);
    if (contexto.EstadoIntentoActivo === 'PENDIENTE_CONCILIACION') throw enConciliacion();

    const monto = contexto.MontoTotal;
    if (monto === null || !(monto > 0)) return this.finalizar(await this.crearPedido(cmd));

    const simulacion: SimulacionPago = cmd.simulacionPago ?? (cmd.simularFalloPago ? 'RECHAZADO' : 'APROBADO');
    const base = { idUsuario: cmd.idUsuario, clave: cmd.claveIdempotencia, monto };

    let autorizacion;
    try {
      autorizacion = await this.gateway.autorizar({ ...base, simulacion });
    } catch (err) {
      const referencia = err instanceof PasarelaTimeoutError ? err.referencia : null;
      await this.payments.registrarIntento({
        ...base,
        estado: 'PENDIENTE_CONCILIACION',
        referencia,
        detalle: 'La pasarela no respondió durante la autorización.',
      });
      throw enConciliacion();
    }

    if (!autorizacion.aprobado || !autorizacion.referencia) {
      await this.payments.registrarIntento({
        ...base,
        estado: 'RECHAZADO',
        referencia: null,
        detalle: autorizacion.motivo ?? 'Pago rechazado.',
      });
      throw new DomainError(
        autorizacion.motivo ?? 'Pago rechazado por el emisor. Puedes reintentar mientras tu reserva siga vigente.',
        'PAGO_RECHAZADO',
        402,
      );
    }

    const referencia = autorizacion.referencia;
    const idIntento = await this.payments.registrarIntento({
      ...base,
      estado: 'AUTORIZADO',
      referencia,
      detalle: null,
    });

    let pedido: ConfirmOrderResult;
    try {
      if (autorizacion.fallaPostCobro) {
        throw new DomainError('El pedido no pudo crearse; el cobro fue revertido.', 'PAGO_REVERTIDO', 502);
      }
      pedido = await this.crearPedido(cmd);
    } catch (err) {
      if (!esErrorDeNegocio(err)) {
        await this.payments.actualizarEstado(idIntento, 'PENDIENTE_CONCILIACION', {
          detalle: 'Error de infraestructura al crear el pedido.',
        });
        throw enConciliacion();
      }
      await this.compensar(idIntento, referencia, 'Anulado: el pedido no se pudo crear.');
      throw err;
    }

    if (pedido.FueIdempotente) {
      await this.compensar(idIntento, referencia, 'Anulado: el pedido ya existía para esta clave.');
      return pedido;
    }

    if (pedido.Total !== undefined && Math.round(pedido.Total * 100) !== Math.round(monto * 100)) {
      await this.payments.actualizarEstado(idIntento, 'PENDIENTE_CONCILIACION', {
        idPedido: pedido.IDPedido,
        detalle: 'Monto distinto al autorizado',
      });
      return this.finalizar(pedido);
    }

    try {
      await this.gateway.capturar(referencia);
      await this.payments.actualizarEstado(idIntento, 'CAPTURADO', {
        idPedido: pedido.IDPedido,
        monto: pedido.Total ?? null,
      });
    } catch (err) {
      console.error('No se pudo capturar el pago; queda para conciliación:', err);
      await this.payments
        .actualizarEstado(idIntento, 'PENDIENTE_CONCILIACION', { idPedido: pedido.IDPedido, detalle: 'Falló la captura.' })
        .catch(e => console.error('No se pudo marcar el pago para conciliación:', e));
    }

    return this.finalizar(pedido);
  }

  private crearPedido(cmd: ConfirmOrderCommand): Promise<ConfirmOrderResult> {
    return this.repo.confirmOrder({
      idUsuario: cmd.idUsuario,
      idCarrito: cmd.idCarrito,
      idDireccion: cmd.idDireccion,
      claveIdempotencia: cmd.claveIdempotencia,
      simularFalloPago: false,
    });
  }

  private async compensar(idIntento: number, referencia: string, detalle: string): Promise<void> {
    try {
      await this.gateway.anular(referencia);
      await this.payments.actualizarEstado(idIntento, 'ANULADO', { detalle });
    } catch (err) {
      console.error('No se pudo anular el pago; queda para conciliación:', err);
      await this.payments
        .actualizarEstado(idIntento, 'PENDIENTE_CONCILIACION', { detalle: 'Falló la anulación.' })
        .catch(e => console.error('No se pudo marcar el pago para conciliación:', e));
    }
  }

  private async finalizar(pedido: ConfirmOrderResult): Promise<ConfirmOrderResult> {
    if (!pedido.FueIdempotente) {
      await this.events.publish({ tipo: 'NUEVO_PEDIDO', payload: { idPedido: pedido.IDPedido } });
    }
    return pedido;
  }
}
