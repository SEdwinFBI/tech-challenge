import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Heart, ImageOff, LogIn, TicketPercent, X } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { CouponDialog } from '../components/CouponDialog';
import { catalogApi } from '@/features/catalog/api/catalogApi';
import { checkoutApi } from '@/features/checkout/api/checkoutApi';
import { ProductRail } from '@/features/catalog/components/ProductRail';
import { useAuth } from '@/features/auth';
import { useFavorites } from '@/features/wishlist/hooks/useFavorites';
import { ErrorState, FreeShippingProgress, Illustration, IvaBreakdown, PriceTag, QuantityStepper, StockIndicator } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';
import { formatMoney, plural } from '@/shared/lib/formatters';
import { quoteShipping } from '@/shared/lib/pricing';
import type { CartItem } from '@/shared/types/domain';

const LineSkeleton: React.FC = () => (
  <div className="flex animate-pulse gap-4 py-5" aria-hidden="true">
    <div className="h-24 w-24 rounded-2xl bg-slate-200/70" />
    <div className="flex-1 space-y-3">
      <div className="h-4 w-2/3 rounded bg-slate-200/70" />
      <div className="h-3 w-1/3 rounded bg-slate-200/70" />
      <div className="h-8 w-32 rounded-full bg-slate-200/70" />
    </div>
  </div>
);

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const { cart, isLoading, isError, refetch, upsertItem, removeItem, removeCoupon, isUpserting, isRemoving, isRemovingCoupon } = useCart();
  const { toggle, isFavorite } = useFavorites();
  const [couponOpen, setCouponOpen] = useState(false);
  const isClient = user?.rol === 'CLIENTE';

  const addresses = useQuery({ queryKey: ['addresses'], queryFn: checkoutApi.getAddresses, enabled: isClient, staleTime: 60_000 });
  const suggestions = useQuery({
    queryKey: ['cart-suggestions'],
    queryFn: () => catalogApi.getProducts({ orden: 'DESTACADOS', tamanoPagina: 8 }),
    staleTime: 60_000,
  });

  const items = cart?.items ?? [];
  const address = addresses.data?.[0];
  const netSubtotal = Math.max(0, (cart?.subtotal ?? 0) - (cart?.descuento ?? 0));
  const quote = address ? quoteShipping(netSubtotal, address) : null;
  const estimatedTotal = (cart?.total ?? 0) + (quote?.cost ?? 0);
  const overLimit = items.some(i => i.Cantidad > i.ExistenciaDisponible);
  const busy = isUpserting || isRemoving;

  const changeQty = (item: CartItem, next: number) => {
    if (next > item.ExistenciaDisponible) {
      toast.warning('Límite de existencia', `Solo hay ${plural(item.ExistenciaDisponible, 'unidad', 'unidades')}.`);
      return;
    }
    if (next <= 0) removeItem(item.IDVariante);
    else upsertItem({ idVariante: item.IDVariante, cantidad: next });
  };

  const moveToFavorites = (item: CartItem) => {
    if (item.IDProducto && !isFavorite(item.IDProducto)) toggle(item.IDProducto);
    removeItem(item.IDVariante);
  };

  const suggestionItems = (suggestions.data?.items ?? []).slice(0, 8);

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Carrito</h1>
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="divide-y divide-slate-100">{[0, 1, 2].map(i => <LineSkeleton key={i} />)}</div>
          <div className="h-80 animate-pulse rounded-3xl bg-slate-200/70" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (isError && !cart) {
    return <ErrorState title="Error al cargar el carrito" onRetry={() => refetch()} />;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-12">
        <div className="flex flex-col items-center rounded-3xl bg-canvas px-6 py-14 text-center animate-fade-up">
          <Illustration name="cart" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Tu carrito está vacío</h1>
          <Link to="/catalogo" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-cta px-7 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
            Ver productos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductRail title="Recomendados" products={suggestionItems} to="/catalogo?orden=DESTACADOS" loading={suggestions.isLoading} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Carrito</h1>
        <span className="text-sm text-slate-500">{(n => `${n} ${n === 1 ? 'producto' : 'productos'}`)(items.reduce((a, i) => a + i.Cantidad, 0))}</span>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
        <section aria-label="Productos en tu carrito">
          <ul className={`divide-y divide-slate-100 transition-opacity ${busy ? 'opacity-70' : ''}`}>
            {items.map(item => {
              const exceeds = item.Cantidad > item.ExistenciaDisponible;
              const variantLabel = [item.Talla, item.Color].filter(Boolean).join(' · ');
              return (
                <li key={item.IDCarritoItem} className="flex gap-4 py-5">
                  <Link
                    to={`/producto/${item.IDProducto ?? ''}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-canvas sm:h-28 sm:w-28"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {item.ImagenUrl ? (
                      <img src={item.ImagenUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300"><ImageOff className="h-6 w-6" /></span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/producto/${item.IDProducto ?? ''}`} className="line-clamp-2 text-sm font-bold text-slate-900 hover:text-brand sm:text-base">
                          {item.Producto}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {variantLabel && <>{variantLabel} · </>}SKU {item.SKU}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.IDVariante)}
                        aria-label={`Quitar ${item.Producto} del carrito`}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <QuantityStepper
                        size="sm"
                        value={item.Cantidad}
                        max={item.ExistenciaDisponible}
                        onChange={n => changeQty(item, n)}
                        onRemove={() => removeItem(item.IDVariante)}
                        disabled={busy}
                      />
                      <div className="text-right">
                        <PriceTag amount={item.SubtotalLinea} size="md" />
                        {item.Cantidad > 1 && <p className="text-[11px] text-slate-400 tabular">{formatMoney(item.PrecioUnitario)} c/u</p>}
                      </div>
                    </div>

                    {exceeds ? (
                      <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Solo hay {item.ExistenciaDisponible} {item.ExistenciaDisponible === 1 ? 'unidad' : 'unidades'}.
                        <button
                          type="button"
                          onClick={() => changeQty(item, Math.max(0, item.ExistenciaDisponible))}
                          className="font-extrabold underline"
                        >
                          {item.ExistenciaDisponible > 0 ? `Ajustar a ${item.ExistenciaDisponible}` : 'Quitar'}
                        </button>
                      </p>
                    ) : (
                      item.ExistenciaDisponible <= 5 && <StockIndicator available={item.ExistenciaDisponible} className="mt-2" />
                    )}

                    {isClient && item.IDProducto && (
                      <button
                        type="button"
                        onClick={() => moveToFavorites(item)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 underline-offset-2 hover:text-brand hover:underline"
                      >
                        <Heart className="h-3.5 w-3.5" /> Mover a favoritos
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-4 rounded-3xl bg-canvas p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-h,7rem)+1rem)]" aria-label="Resumen del pedido">
          <h2 className="text-lg font-extrabold text-slate-900">Resumen</h2>

          {isClient && quote && <FreeShippingProgress subtotalNeto={netSubtotal} freeFrom={quote.freeFrom} />}

          {cart?.cupon ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <TicketPercent className="h-4 w-4" /> {cart.cupon.codigo}
              </p>
              <button
                type="button"
                onClick={() => removeCoupon()}
                disabled={isRemovingCoupon}
                className="text-xs font-extrabold text-emerald-800 underline disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (user ? setCouponOpen(true) : toast.info('Inicia sesión para usar cupones'))}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-brand"
            >
              <span className="flex items-center gap-2"><TicketPercent className="h-4 w-4 text-brand" /> Aplicar cupón</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          )}

          <dl className="space-y-2 text-sm tabular">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-bold text-slate-900">{formatMoney(cart?.subtotal)}</dd>
            </div>
            {(cart?.descuento ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Descuento</dt>
                <dd className="font-bold">-{formatMoney(cart?.descuento)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-600">Envío</dt>
              <dd className="font-bold text-slate-900">
                {quote ? (quote.free ? <span className="text-emerald-700">GRATIS</span> : formatMoney(quote.cost)) : <span className="text-xs font-medium text-slate-500">Se calcula al pagar</span>}
              </dd>
            </div>
          </dl>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-end justify-between">
              <span className="text-sm font-bold text-slate-900">{quote ? 'Total estimado' : 'Total de productos'}</span>
              <PriceTag amount={quote ? estimatedTotal : cart?.total} size="lg" />
            </div>
            <IvaBreakdown total={quote ? estimatedTotal : cart?.total ?? 0} className="mt-3" />
          </div>

          {!user && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-white p-3 text-xs text-slate-600">
              <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>Inicia sesión para pagar. <strong>Tu carrito se conserva.</strong></span>
            </div>
          )}

          <button
            type="button"
            disabled={overLimit || busy}
            onClick={() => navigate('/checkout')}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cta text-base font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {user ? 'Continuar al pago' : 'Ingresar y pagar'} <ArrowRight className="h-5 w-5" />
          </button>
          {overLimit && <p className="text-center text-xs font-semibold text-rose-600">Ajusta las cantidades para continuar.</p>}
          <Link to="/catalogo" className="block text-center text-sm font-bold text-slate-600 hover:text-brand">Seguir comprando</Link>
        </aside>
      </div>

      <div className="mt-14">
        <ProductRail title="Recomendados" products={suggestionItems} to="/catalogo?orden=DESTACADOS" loading={suggestions.isLoading} />
      </div>

      <CouponDialog isOpen={couponOpen} onClose={() => setCouponOpen(false)} />
    </div>
  );
};
