import React from 'react';
import { SafeImage } from '@/shared/ui/SafeImage';
import { IvaBreakdown } from '@/shared/ui/IvaBreakdown';
import { PriceTag } from '@/shared/ui/PriceTag';
import { formatMoney } from '@/shared/lib/formatters';
import type { Cart } from '@/shared/types/domain';
import type { ShippingQuote } from '@/shared/lib/pricing';

export interface OrderSummaryProps {
  cart: Cart;
  shipping: ShippingQuote | null;
  total: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ cart, shipping, total }) => (
  <aside className="rounded-3xl bg-canvas p-5 sm:p-6 lg:sticky lg:top-6" aria-label="Resumen de tu pedido">
    <h2 className="mb-4 text-lg font-extrabold text-slate-900">Tu pedido</h2>
    <ul className="max-h-72 space-y-4 overflow-y-auto pr-1">
      {cart.items.map(item => (
        <li key={item.IDCarritoItem} className="flex gap-3">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
            <SafeImage src={item.ImagenUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-slate-800 px-1 text-[11px] font-bold text-white">
              {item.Cantidad}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold text-slate-800">{item.Producto}</p>
            <p className="text-xs text-slate-500">{[item.Talla, item.Color].filter(Boolean).join(' · ')}</p>
          </div>
          <p className="text-sm font-bold tabular text-slate-900">{formatMoney(item.SubtotalLinea)}</p>
        </li>
      ))}
    </ul>

    <dl className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm tabular">
      <div className="flex justify-between">
        <dt className="text-slate-600">Subtotal</dt>
        <dd className="font-bold">{formatMoney(cart.subtotal)}</dd>
      </div>
      {cart.descuento > 0 && (
        <div className="flex justify-between text-emerald-700">
          <dt>Descuento{cart.cupon ? ` (${cart.cupon.codigo})` : ''}</dt>
          <dd className="font-bold">-{formatMoney(cart.descuento)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-slate-600">Envío</dt>
        <dd className="font-bold">
          {shipping ? shipping.free ? <span className="text-emerald-700">GRATIS</span> : formatMoney(shipping.cost) : '—'}
        </dd>
      </div>
    </dl>

    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-end justify-between">
        <span className="text-sm font-bold text-slate-900">Total</span>
        <PriceTag amount={total} size="lg" />
      </div>
      <IvaBreakdown total={total} className="mt-3" />
    </div>
  </aside>
);
