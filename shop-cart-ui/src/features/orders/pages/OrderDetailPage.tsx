import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, XCircle } from 'lucide-react';
import { ordersApi } from '../api/ordersApi';
import { orderDetailQueryOptions } from '../queries';
import { OrderLineAmount } from '../components/OrderLineAmount';
import { ConfirmDialog, ErrorState, IvaBreakdown, OrderTimeline, PriceTag, getOrderStatusBadge } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';
import { formatDateTime, formatMoney } from '@/shared/lib/formatters';
import { HAPPY_PATH, canClientCancel, happyPathIndex, orderStatusMeta } from '@/shared/lib/orderStatus';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { invalidateStock, mutationKeys, queryKeys } from '@/shared/lib/queryKeys';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const orderId = Number(id);
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading, isError, refetch } = useQuery(orderDetailQueryOptions(orderId));

  const cancel = useMutation({
    mutationKey: mutationKeys.orders.cancel,
    mutationFn: () =>
      ordersApi.updateOrderStatus(orderId, 'CANCELADO', cancelReason.trim() || 'Cancelado por solicitud del cliente'),
    onSuccess: () => {
      toast.success('Pedido cancelado');
      setCancelOpen(false);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void invalidateStock(queryClient);
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'No se pudo cancelar.');
      toast.error('Error al cancelar', msg);
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
  });

  if (isLoading) {
    return <div className="space-y-4" aria-busy="true"><div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" /></div>;
  }
  if (isError || !data) {
    return (
      <div className="max-w-lg">
        <ErrorState title="Pedido no encontrado" onRetry={() => refetch()} />
        <Link to="/cuenta/pedidos" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"><ArrowLeft className="h-4 w-4" /> Mis pedidos</Link>
      </div>
    );
  }

  const { pedido, detalles, historial } = data;
  const meta = orderStatusMeta(pedido.Estado);
  const idx = happyPathIndex(pedido.Estado);

  return (
    <div className="animate-fade-up">
      <Link to="/cuenta/pedidos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Mis pedidos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-extrabold tracking-wide text-slate-900">{pedido.NumeroSeguimiento}</h1>
          <p className="text-sm text-slate-500">Comprado el {formatDateTime(pedido.FechaCreacion)}</p>
        </div>
        <div className="flex items-center gap-3">
          {getOrderStatusBadge(pedido.Estado)}
          {canClientCancel(pedido.Estado) && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
            >
              <XCircle className="h-4 w-4" /> Cancelar pedido
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">{meta.hint}</p>

      {idx >= 0 && (
        <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Progreso del pedido">
          {HAPPY_PATH.map((s, i) => (
            <li key={s.code} className="text-center">
              <span className={`mb-1.5 block h-2 rounded-full ${i <= idx ? 'bg-brand' : 'bg-slate-200'}`} />
              <span className={`text-[11px] font-bold sm:text-xs ${i <= idx ? 'text-brand' : 'text-slate-400'}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section aria-labelledby="h-items" className="overflow-hidden rounded-2xl border border-slate-200">
            <h2 id="h-items" className="border-b border-slate-100 bg-canvas px-5 py-3 text-sm font-extrabold text-slate-900">Productos</h2>
            <ul className="divide-y divide-slate-100">
              {detalles.map(d => (
                <li key={d.IDDetalle || `${d.IDVariante}`} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{d.Producto}</p>
                    <p className="text-xs text-slate-500">SKU {d.SKU}{[d.Talla, d.Color].filter(Boolean).length > 0 && ` · ${[d.Talla, d.Color].filter(Boolean).join(' · ')}`}</p>
                    <p className="text-xs text-slate-500">{d.Cantidad} × {formatMoney(d.PrecioUnitario)}</p>
                    {d.CantidadDevuelta > 0 && (
                      <p className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        {d.CantidadDevuelta} {d.CantidadDevuelta === 1 ? 'unidad devuelta' : 'unidades devueltas'}
                      </p>
                    )}
                  </div>
                  <OrderLineAmount item={d} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-hist" className="rounded-2xl border border-slate-200 p-5">
            <h2 id="h-hist" className="mb-4 text-sm font-extrabold text-slate-900">Historial</h2>
            <OrderTimeline history={historial} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h,7rem)+1rem)]">
          <div className="space-y-2 rounded-2xl bg-canvas p-5 text-sm tabular">
            <h2 className="mb-2 text-sm font-extrabold text-slate-900">Resumen</h2>
            <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-bold">{formatMoney(pedido.Subtotal)}</span></div>
            {pedido.Descuento > 0 && <div className="flex justify-between text-emerald-700"><span>Descuento</span><span className="font-bold">-{formatMoney(pedido.Descuento)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-600">Envío</span><span className="font-bold">{pedido.CostoEnvio > 0 ? formatMoney(pedido.CostoEnvio) : <span className="text-emerald-700">GRATIS</span>}</span></div>
            <div className="flex items-end justify-between border-t border-slate-200 pt-3">
              <span className="font-extrabold text-slate-900">Total pagado</span>
              <PriceTag amount={pedido.Total} size="md" />
            </div>
            {pedido.MontoReembolsado > 0 && (
              <div className="flex justify-between rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                <span className="font-semibold">Reembolsado</span>
                <span className="font-extrabold">-{formatMoney(pedido.MontoReembolsado)}</span>
              </div>
            )}
            <IvaBreakdown total={pedido.Total} base={pedido.BaseImponibleSinIVA} iva={pedido.MontoIVA12} className="pt-2" />
          </div>

          {pedido.DireccionEntrega && (
            <div className="rounded-2xl border border-slate-200 p-5 text-sm">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900"><MapPin className="h-4 w-4 text-brand" /> Entrega</h2>
              <p className="text-slate-600">{pedido.DireccionEntrega}</p>
              {pedido.TelefonoContacto && <p className="mt-1 text-xs text-slate-500">Tel. {pedido.TelefonoContacto}</p>}
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate()}
        loading={cancel.isPending}
        title="Cancelar pedido"
        consequence="Las unidades vuelven al inventario."
        confirmText="Sí, cancelar"
        cancelText="No"
      >
        <textarea
          value={cancelReason}
          onChange={e => setCancelReason(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Cuéntanos por qué (opcional)"
          aria-label="Motivo de la cancelación"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </ConfirmDialog>
    </div>
  );
};
