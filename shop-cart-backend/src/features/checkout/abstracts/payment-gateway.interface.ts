export type SimulacionPago = 'APROBADO' | 'RECHAZADO' | 'ERROR_TRAS_COBRO' | 'TIMEOUT';

export interface AutorizarPagoParams {
  clave: string;
  monto: number;
  idUsuario: number;
  simulacion?: SimulacionPago;
}

export interface ResultadoAutorizacion {
  aprobado: boolean;
  referencia: string | null;
  motivo?: string;
  fallaPostCobro?: boolean;
}

export interface ConsultaPago {
  referencia: string;
  estado: 'AUTORIZADO' | 'CAPTURADO' | 'ANULADO' | 'DESCONOCIDO';
}

export class PasarelaTimeoutError extends Error {
  constructor(
    message: string,
    public readonly referencia: string | null = null,
  ) {
    super(message);
    Object.setPrototypeOf(this, PasarelaTimeoutError.prototype);
  }
}

export interface IPaymentGateway {
  autorizar(params: AutorizarPagoParams): Promise<ResultadoAutorizacion>;
  capturar(referencia: string): Promise<void>;
  anular(referencia: string): Promise<void>;
  consultar(referencia: string): Promise<ConsultaPago>;
}
