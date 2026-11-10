import type { OrderStatus } from '@/shared/types/domain';

export interface OrderStatusMeta {
  label: string;
  hint: string;
  tone: 'info' | 'purple' | 'warning' | 'success' | 'error' | 'neutral';
}

export const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
  PAGADO: { label: 'Pagado', hint: 'Recibimos tu pago.', tone: 'info' },
  EN_PREPARACION: { label: 'En preparación', hint: 'Preparando tu pedido.', tone: 'purple' },
  DESPACHADO: { label: 'Despachado', hint: 'Salió con la mensajería.', tone: 'warning' },
  ENTREGADO: { label: 'Entregado', hint: 'Pedido entregado.', tone: 'success' },
  CANCELADO: { label: 'Cancelado', hint: 'Las unidades volvieron al inventario.', tone: 'error' },
  DEVUELTO_PARCIAL: { label: 'Devolución parcial', hint: 'Se devolvieron algunas unidades.', tone: 'warning' },
  DEVUELTO_TOTAL: { label: 'Devuelto', hint: 'Se devolvió todo el pedido.', tone: 'error' },
};

export function orderStatusMeta(status: string): OrderStatusMeta {
  return ORDER_STATUS_META[status] ?? { label: status, hint: '', tone: 'neutral' };
}

// Igual que TransicionesEstadoPedido y order-state.machine (backend)
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PAGADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['DESPACHADO', 'CANCELADO'],
  DESPACHADO: ['ENTREGADO'],
  ENTREGADO: ['DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL'],
  CANCELADO: [],
  DEVUELTO_PARCIAL: ['DEVUELTO_TOTAL'],
  DEVUELTO_TOTAL: [],
};

export function canClientCancel(status: OrderStatus | string): boolean {
  return status === 'PAGADO' || status === 'EN_PREPARACION';
}

export const HAPPY_PATH: Array<{ code: string; label: string }> = [
  { code: 'PAGADO', label: 'Pagado' },
  { code: 'EN_PREPARACION', label: 'En preparación' },
  { code: 'DESPACHADO', label: 'Despachado' },
  { code: 'ENTREGADO', label: 'Entregado' },
];

export function happyPathIndex(status: string): number {
  return HAPPY_PATH.findIndex(s => s.code === status);
}
