import { apiClient } from '@/shared/lib/apiClient';
import { Address, Municipality } from '@/shared/types/domain';
import type { RawConfirmOrderResponse, RawReserveStockResponse } from './checkoutApi.types';

export interface CreateAddressPayload {
  etiqueta: string;
  idMunicipio: number;
  direccionExacta: string;
  telefonoContacto: string;
  predeterminada?: boolean;
}

export interface ReserveStockResponse {
  ok: boolean;
  idReserva: number;
  expiraEn: string;
  itemsReservados: number;
  duracionMs: number;
}

export interface ConfirmOrderPayload {
  idCarrito: number;
  idDireccion: number;
  claveIdempotencia: string;
  simulacionPago?: 'APROBADO' | 'RECHAZADO' | 'ERROR_TRAS_COBRO' | 'TIMEOUT';
}

export interface ConfirmOrderResponse {
  ok: boolean;
  idPedido: number;
  numeroSeguimiento: string;
  total?: number;
  FueIdempotente?: number | boolean;
}

export const checkoutApi = {
  getMunicipalities: async (): Promise<Municipality[]> => {
    const res = await apiClient.get<{ ok: boolean; datos: Municipality[] }>('/checkout/municipios');
    return res.data.datos;
  },

  getAddresses: async (): Promise<Address[]> => {
    const res = await apiClient.get<{ ok: boolean; datos: Address[] }>('/checkout/direcciones');
    return res.data.datos;
  },

  createAddress: async (data: CreateAddressPayload): Promise<Address[]> => {
    const res = await apiClient.post<{ ok: boolean; datos: Address[] }>('/checkout/direcciones', data);
    return res.data.datos;
  },

  deleteAddress: async (idDireccion: number): Promise<Address[]> => {
    const res = await apiClient.delete<{ ok: boolean; datos: Address[] }>(`/checkout/direcciones/${idDireccion}`);
    return res.data.datos;
  },

  setDefaultAddress: async (idDireccion: number): Promise<Address[]> => {
    const res = await apiClient.patch<{ ok: boolean; datos: Address[] }>(`/checkout/direcciones/${idDireccion}/predeterminada`);
    return res.data.datos;
  },

  reserveStock: async (idCarrito: number): Promise<ReserveStockResponse> => {
    const res = await apiClient.post<RawReserveStockResponse>('/checkout/reservar', { idCarrito });
    const raw = res.data;
    const expiration = raw.FechaExpiracionReserva ?? raw.ReservaExpiracion ?? '';
    const serverNow = Date.parse(raw.FechaServidor ?? '');
    const remaining = Date.parse(expiration) - serverNow;
    return {
      ok: raw.ok ?? true,
      idReserva: raw.IDReserva ?? raw.idReserva ?? 0,
      expiraEn: Number.isFinite(remaining) ? new Date(Date.now() + Math.max(0, remaining)).toISOString() : expiration,
      itemsReservados: raw.ItemsReservados ?? raw.itemsReservados ?? 0,
      duracionMs: Number(raw.DuracionReservaSegundos ?? 900) * 1000,
    };
  },

  confirmOrder: async (data: ConfirmOrderPayload): Promise<ConfirmOrderResponse> => {
    const res = await apiClient.post<RawConfirmOrderResponse>('/checkout/confirmar', data);
    const raw = res.data;
    return {
      ok: raw.ok ?? true,
      idPedido: (raw.IDPedido ?? raw.idPedido) as number,
      numeroSeguimiento: raw.NumeroPedido ?? raw.numeroSeguimiento ?? '',
      total: raw.Total ?? raw.total,
      FueIdempotente: raw.FueIdempotente,
    };
  },
};
