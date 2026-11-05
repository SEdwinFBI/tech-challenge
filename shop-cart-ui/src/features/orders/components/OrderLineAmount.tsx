import { formatMoney } from '@/shared/lib/formatters';
import type { OrderItem } from '@/shared/types/domain';

export function OrderLineAmount({ item }: { item: Pick<OrderItem, 'Cantidad' | 'PrecioUnitario' | 'Subtotal'> }) {
  const original = Math.round(item.Cantidad * item.PrecioUnitario * 100);
  const discount = Math.max(0, original - Math.round(item.Subtotal * 100));
  return (
    <div className="shrink-0 text-right tabular">
      {discount > 0 && (
        <>
          <p className="text-xs text-slate-500">Antes: {formatMoney(original / 100)}</p>
          <p className="text-xs text-emerald-700">Descuento: −{formatMoney(discount / 100)}</p>
          <p className="text-xs text-slate-500">Importe con descuento</p>
        </>
      )}
      <p className="text-sm font-extrabold text-slate-900">{formatMoney(item.Subtotal)}</p>
    </div>
  );
}
