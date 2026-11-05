import { apiClient } from '@/shared/lib/apiClient';

export type PaymentStatus = 'AUTORIZADO' | 'CAPTURADO' | 'RECHAZADO' | 'ANULADO' | 'PENDIENTE_CONCILIACION';

export interface PaymentAttempt {
  IDIntentoPago: number;
  IDUsuario: number;
  Correo: string;
  ClaveIdempotencia: string;
  Monto: number;
  Estado: PaymentStatus;
  ReferenciaPasarela: string | null;
  Detalle: string | null;
  IDPedido: number | null;
  FechaCreacion: string;
  FechaActualizacion: string;
}

export interface PaymentsResponse {
  ok: boolean;
  datos: PaymentAttempt[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export interface GetPaymentsParams {
  estado?: PaymentStatus;
  direccion?: 'asc' | 'desc';
  pagina?: number;
  tamanoPagina?: number;
}

export const paymentsApi = {
  getPayments: async (params: GetPaymentsParams): Promise<PaymentsResponse> => {
    const res = await apiClient.get<PaymentsResponse>('/checkout/pagos', { params });
    return res.data;
  },
};
