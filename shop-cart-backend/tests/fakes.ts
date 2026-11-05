import { EventoDominio, IEventPublisher } from '@/core/events/event-publisher.interface';
import { ICheckoutRepository } from '@/features/checkout/abstracts/checkout.repository.interface';
import {
  AutorizarPagoParams,
  IPaymentGateway,
  ResultadoAutorizacion,
} from '@/features/checkout/abstracts/payment-gateway.interface';
import { IPaymentsRepository } from '@/features/checkout/abstracts/payments.repository.interface';
import {
  ContextoPago,
  EstadoIntentoPago,
  IntentoPendienteDTO,
  RegistrarIntentoParams,
} from '@/features/checkout/models/payments.model';
import { ConfirmOrderResult } from '@/features/checkout/models/checkout.model';

export class FakePublisher implements IEventPublisher {
  eventos: EventoDominio[] = [];
  async publish(evento: EventoDominio): Promise<void> {
    this.eventos.push(evento);
  }
}

export class FakeGateway implements IPaymentGateway {
  llamadas: string[] = [];
  autorizacion: ResultadoAutorizacion | Error = { aprobado: true, referencia: 'REF-1' };
  falloAnular = false;
  ultimaAutorizacion: AutorizarPagoParams | null = null;

  async autorizar(params: AutorizarPagoParams): Promise<ResultadoAutorizacion> {
    this.llamadas.push('autorizar');
    this.ultimaAutorizacion = params;
    if (this.autorizacion instanceof Error) throw this.autorizacion;
    return this.autorizacion;
  }
  async capturar(referencia: string): Promise<void> {
    this.llamadas.push(`capturar:${referencia}`);
  }
  async anular(referencia: string): Promise<void> {
    this.llamadas.push(`anular:${referencia}`);
    if (this.falloAnular) throw new Error('fallo al anular');
  }
  async consultar(referencia: string) {
    this.llamadas.push(`consultar:${referencia}`);
    return { referencia, estado: 'AUTORIZADO' as const };
  }
}

export interface RegistroIntento {
  id: number;
  estado: EstadoIntentoPago;
  idPedido?: number | null;
  params?: RegistrarIntentoParams;
}

export class FakePaymentsRepo implements IPaymentsRepository {
  contexto: ContextoPago = { IDPedidoExistente: null, MontoTotal: 120.5, EstadoIntentoActivo: null };
  registrados: RegistrarIntentoParams[] = [];
  actualizaciones: Array<{ id: number; estado: EstadoIntentoPago; idPedido?: number | null }> = [];
  pendientes: IntentoPendienteDTO[] = [];

  async obtenerContexto(): Promise<ContextoPago> {
    return this.contexto;
  }
  async registrarIntento(params: RegistrarIntentoParams): Promise<number> {
    this.registrados.push(params);
    return this.registrados.length;
  }
  async actualizarEstado(id: number, estado: EstadoIntentoPago, opciones?: { idPedido?: number | null }) {
    this.actualizaciones.push({ id, estado, idPedido: opciones?.idPedido });
  }
  async listarPendientes(): Promise<IntentoPendienteDTO[]> {
    return this.pendientes;
  }
  async listar() {
    return { items: [], totalRegistros: 0 };
  }
}

export function fakeCheckoutRepo(
  confirmOrder: ICheckoutRepository['confirmOrder'],
): ICheckoutRepository {
  return {
    getMunicipalities: async () => [],
    getAddresses: async () => [],
    createAddress: async () => [],
    deleteAddress: async () => [],
    setDefaultAddress: async () => [],
    reserveStock: async () => ({}),
    confirmOrder,
  };
}

export const pedidoNuevo = (): ConfirmOrderResult => ({ IDPedido: 77, FueIdempotente: 0, Total: 120.5 });
