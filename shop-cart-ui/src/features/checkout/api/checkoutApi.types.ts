export interface RawReserveStockResponse {
  ok?: boolean;
  IDReserva?: number;
  idReserva?: number;
  ItemsReservados?: number;
  itemsReservados?: number;
  FechaExpiracionReserva?: string;
  ReservaExpiracion?: string;
  FechaServidor?: string;
  DuracionReservaSegundos?: number | string;
}

export interface RawConfirmOrderResponse {
  ok?: boolean;
  IDPedido?: number;
  idPedido?: number;
  NumeroPedido?: string;
  numeroSeguimiento?: string;
  Total?: number;
  total?: number;
  FueIdempotente?: number | boolean;
}
