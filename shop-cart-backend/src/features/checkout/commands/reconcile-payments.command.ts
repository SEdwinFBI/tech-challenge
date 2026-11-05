import { env } from '@/core/config/env';
import { ICommandHandler } from '@/core/cqrs/index';
import { IPaymentGateway } from '../abstracts/payment-gateway.interface';
import { IPaymentsRepository } from '../abstracts/payments.repository.interface';
import { SimulatedPaymentGateway } from '../infrastructure/simulated-payment.gateway';
import { PaymentsRepository } from '../repository/payments.repository';

export interface ReconcilePaymentsResult {
  capturados: number;
  anulados: number;
  pendientes: number;
}

export class ReconcilePaymentsCommandHandler implements ICommandHandler<void, ReconcilePaymentsResult> {
  constructor(
    private readonly payments: IPaymentsRepository = new PaymentsRepository(),
    private readonly gateway: IPaymentGateway = new SimulatedPaymentGateway(),
    private readonly ttlMinutos: number = env.RESERVATION_TTL_MINUTES ?? 15,
  ) {}

  async handle(): Promise<ReconcilePaymentsResult> {
    const resultado: ReconcilePaymentsResult = { capturados: 0, anulados: 0, pendientes: 0 };
    const pendientes = await this.payments.listarPendientes();

    for (const intento of pendientes) {
      try {
        if (intento.IDPedidoExistente !== null) {
          if (intento.TotalPedido !== null && Math.round(intento.TotalPedido * 100) !== Math.round(intento.Monto * 100)) {
            resultado.pendientes++;
            continue;
          }
          if (intento.ReferenciaPasarela) await this.gateway.capturar(intento.ReferenciaPasarela);
          await this.payments.actualizarEstado(intento.IDIntentoPago, 'CAPTURADO', {
            idPedido: intento.IDPedidoExistente,
            monto: intento.TotalPedido,
            detalle: 'Conciliado: el pedido existe.',
          });
          resultado.capturados++;
        } else if (intento.MinutosAntiguedad >= this.ttlMinutos) {
          if (intento.ReferenciaPasarela) await this.gateway.anular(intento.ReferenciaPasarela);
          await this.payments.actualizarEstado(intento.IDIntentoPago, 'ANULADO', {
            detalle: 'Conciliado: no se creó el pedido y venció la reserva.',
          });
          resultado.anulados++;
        } else {
          resultado.pendientes++;
        }
      } catch (err) {
        resultado.pendientes++;
        console.error(`Error al conciliar el intento de pago ${intento.IDIntentoPago}:`, err);
      }
    }

    return resultado;
  }
}
