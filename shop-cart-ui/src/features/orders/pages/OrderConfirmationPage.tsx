import React from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MapPin } from 'lucide-react';
import { ordersApi } from '../api/ordersApi';
import { OrderLineAmount } from '../components/OrderLineAmount';
import { ErrorState, Illustration, IvaBreakdown, PriceTag, getOrderStatusBadge } from '@/shared/ui';
import { formatDateTime, formatMoney } from '@/shared/lib/formatters';
import { orderNumber } from '@/shared/lib/pricing';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams();
  const orderId = Number(id);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => ordersApi.getOrderById(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  if (isLoading) {
    return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-3xl bg-slate-200/70" aria-busy="true" />;
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <ErrorState title="Error al cargar el pedido" message="Tu compra se registró." onRetry={() => refetch()} />
        <Link to="/cuenta/pedidos" className="mt-4 block text-center text-sm font-bold text-brand hover:underline">Mis pedidos</Link>
      </div>
    );
  }

  const { pedido, detalles } = data;
  const numero = pedido.NumeroSeguimiento || orderNumber(pedido.IDPedido);

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <Illustration name="success" className="w-44" />
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Gracias por tu compra</h1>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand">
          Pedido <span className="font-mono tracking-wider">{numero}</span>
        </p>
        <div className="mt-3">{getOrderStatusBadge(pedido.Estado)}</div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
        <ul className="divide-y divide-slate-100">
          {detalles.map(d => (
            <li key={d.IDDetalle || d.IDVariante} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{d.Producto}</p>
                <p className="text-xs text-slate-500">
                  {[d.Talla, d.Color].filter(Boolean).join(' · ')} · {d.Cantidad} × {formatMoney(d.PrecioUnitario)}
                </p>
              </div>
              <OrderLineAmount item={d} />
            </li>
          ))}
        </ul>

        <div className="space-y-2 bg-canvas px-5 py-4 text-sm tabular">
          <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-bold">{formatMoney(pedido.Subtotal)}</span></div>
          {pedido.Descuento > 0 && (
            <div className="flex justify-between text-emerald-700"><span>Descuento</span><span className="font-bold">-{formatMoney(pedido.Descuento)}</span></div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">Envío</span>
            <span className="font-bold">{pedido.CostoEnvio > 0 ? formatMoney(pedido.CostoEnvio) : <span className="text-emerald-700">GRATIS</span>}</span>
          </div>
          <div className="flex items-end justify-between border-t border-slate-200 pt-3">
            <span className="font-extrabold text-slate-900">Total pagado</span>
            <PriceTag amount={pedido.Total} size="lg" />
          </div>
          <IvaBreakdown total={pedido.Total} base={pedido.BaseImponibleSinIVA} iva={pedido.MontoIVA12} className="pt-1" />
        </div>
      </div>

      {pedido.DireccionEntrega && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span><strong className="text-slate-900">Entrega en:</strong> {pedido.DireccionEntrega}</span>
        </p>
      )}
      <p className="mt-3 text-center text-xs text-slate-400">Comprado el {formatDateTime(pedido.FechaCreacion)}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to={`/cuenta/pedidos/${pedido.IDPedido}`}
          className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-cta py-3.5 text-sm font-extrabold text-cta-fg shadow-lift hover:bg-cta-hover"
        >
          Ver pedido <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/catalogo" className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
};
