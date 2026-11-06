import { apiClient } from '@/shared/lib/apiClient';
import { Order, OrderItem, OrderHistoryEntry, OrderStatus } from '@/shared/types/domain';

export type OrderSortColumn = 'fecha' | 'total' | 'estado' | 'cliente';

export interface GetOrdersParams {
  orden?: OrderSortColumn;
  direccion?: 'asc' | 'desc';
  pagina?: number;
  tamanoPagina?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  idCliente?: number;
  numeroSeguimiento?: string;
  cliente?: string;
  totalMin?: number;
  totalMax?: number;
}

export interface OrdersListResponse {
  ok: boolean;
  datos: Order[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export interface OrderDetailResponse {
  ok: boolean;
  pedido: Order;
  detalles: OrderItem[];
  historial: OrderHistoryEntry[];
}

export const ordersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<OrdersListResponse> => {
    const res = await apiClient.get<any>('/pedidos', { params });
    const raw = res.data;
    const items: Order[] = (raw.datos || []).map((o: any) => ({
      ...o,
      NumeroSeguimiento: o.NumeroSeguimiento || o.NumeroPedido || `ORD-${String(o.IDPedido).padStart(6, '0')}`,
      Subtotal: Number(o.Subtotal || 0),
      Descuento: Number(o.Descuento || 0),
      CostoEnvio: Number(o.CostoEnvio || 0),
      Total: Number(o.Total || 0),
      MontoReembolsado: Number(o.MontoReembolsado || 0),
      BaseImponibleSinIVA: Number(o.BaseImponibleSinIVA || 0),
      MontoIVA12: Number(o.MontoIVA12 || 0),
      TotalNetoPagado: Number(o.TotalNetoPagado || o.Total || 0),
    }));
    return {
      ok: raw.ok ?? true,
      datos: items,
      total: raw.total ?? items.length,
      pagina: raw.pagina ?? 1,
      tamanoPagina: raw.tamanoPagina ?? 15,
    };
  },

  getOrderById: async (id: number): Promise<OrderDetailResponse> => {
    const res = await apiClient.get<any>(`/pedidos/${id}`);
    const raw = res.data;
    const p = raw.pedido || {};
    const pedido: Order = {
      ...p,
      NumeroSeguimiento: p.NumeroSeguimiento || p.NumeroPedido || `ORD-${String(p.IDPedido).padStart(6, '0')}`,
      DireccionEntrega:
        p.DireccionEntrega ?? ([p.DireccionExacta, p.Municipio, p.Departamento].filter(Boolean).join(', ') || undefined),
      Subtotal: Number(p.Subtotal || 0),
      Descuento: Number(p.Descuento || 0),
      CostoEnvio: Number(p.CostoEnvio || 0),
      Total: Number(p.Total || 0),
      MontoReembolsado: Number(p.MontoReembolsado || 0),
      BaseImponibleSinIVA: Number(p.BaseImponibleSinIVA || 0),
      MontoIVA12: Number(p.MontoIVA12 || 0),
      TotalNetoPagado: Number(p.TotalNetoPagado || p.Total || 0),
    };
    const detalles: OrderItem[] = (raw.detalles || []).map((d: any) => ({
      IDDetalle: d.IDPedidoDetalle ?? d.IDDetallePedido ?? d.IDDetalle ?? 0,
      IDVariante: d.IDVariante,
      SKU: d.SKU || '',
      Producto: d.Producto || d.NombreProducto || '',
      Color: d.Color || '',
      Talla: d.Talla || '',
      Cantidad: d.CantidadComprada ?? d.Cantidad ?? 0,
      PrecioUnitario: d.PrecioUnitarioCongelado ?? d.PrecioUnitario ?? 0,
      Subtotal: d.SubtotalLinea ?? d.Subtotal ?? 0,
      CantidadDevuelta: d.CantidadDevuelta ?? 0,
    }));
    const toCode = (v: string) => (v ? v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/s+/g, '_') : '');
    const historial: OrderHistoryEntry[] = (raw.historial || []).map((h: any) => ({
      IDHistorial: h.IDPedidoHistorial ?? h.IDHistorial ?? 0,
      EstadoAnterior: toCode(h.EstadoAnterior || ''),
      EstadoNuevo: toCode(h.EstadoNuevo || ''),
      FechaCambio: h.FechaCambio || '',
      UsuarioResponsable: h.Usuario || h.UsuarioResponsable || '',
      Motivo: h.Comentario ?? h.Motivo ?? '',
    }));
    return {
      ok: raw.ok ?? true,
      pedido,
      detalles,
      historial,
    };
  },

  updateOrderStatus: async (id: number, nuevoEstado: OrderStatus, motivo?: string): Promise<{ ok: boolean; idPedido: number; estado: OrderStatus }> => {
    const res = await apiClient.patch<{ ok: boolean; idPedido: number; estado: OrderStatus }>(`/pedidos/${id}/estado`, {
      nuevoEstado,
      comentario: motivo || undefined,
    });
    return res.data;
  },

  returnOrderLine: async (idPedido: number, data: { idDetalle: number; cantidadDevolver: number; motivo: string }): Promise<void> => {
    await apiClient.post(`/pedidos/${idPedido}/devoluciones`, {
      idPedidoDetalle: data.idDetalle,
      cantidadADevolver: data.cantidadDevolver,
      motivo: data.motivo,
    });
  },
};
