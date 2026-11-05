import { createHash } from 'node:crypto';
import { env } from '@/core/config/env';
import {
  AutorizarPagoParams,
  ConsultaPago,
  IPaymentGateway,
  PasarelaTimeoutError,
  ResultadoAutorizacion,
} from '../abstracts/payment-gateway.interface';

export class SimulatedPaymentGateway implements IPaymentGateway {
  async autorizar(params: AutorizarPagoParams): Promise<ResultadoAutorizacion> {
    const simulacion = env.NODE_ENV === 'production' ? 'APROBADO' : (params.simulacion ?? 'APROBADO');
    const referencia = this.referencia(params.clave, params.idUsuario);

    if (simulacion === 'RECHAZADO') {
      return {
        aprobado: false,
        referencia: null,
        motivo: 'Pago rechazado por el emisor. Puedes reintentar mientras tu reserva siga vigente.',
      };
    }
    if (simulacion === 'TIMEOUT') {
      throw new PasarelaTimeoutError('La pasarela de pago no respondió a tiempo.', referencia);
    }
    return { aprobado: true, referencia, fallaPostCobro: simulacion === 'ERROR_TRAS_COBRO' };
  }

  async capturar(_referencia: string): Promise<void> {}

  async anular(_referencia: string): Promise<void> {}

  async consultar(referencia: string): Promise<ConsultaPago> {
    return { referencia, estado: 'AUTORIZADO' };
  }

  private referencia(clave: string, idUsuario: number): string {
    return `SIM-${createHash('sha256').update(`${idUsuario}:${clave}`).digest('hex').slice(0, 24)}`;
  }
}
