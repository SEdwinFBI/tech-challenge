export type EventoDominio =
  | { tipo: 'NUEVO_PEDIDO'; payload: { idPedido: number } }
  | { tipo: 'CAMBIO_ESTADO_PEDIDO'; payload: { idPedido: number; estado: string } }
  | { tipo: 'DEVOLUCION_PEDIDO'; payload: { idPedido: number; idPedidoDetalle: number } }
  | { tipo: 'CATALOGO_ACTUALIZADO'; payload: Record<string, unknown> }
  | { tipo: 'CATALOGO_CATEGORIA_ACTUALIZADA'; payload: { idCategoria?: number; nombre?: string } };

export interface IEventPublisher {
  publish(evento: EventoDominio): Promise<void>;
}
