import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Heart, Loader2, MapPin, ShoppingCart, Truck } from 'lucide-react';
import { catalogApi } from '../api/catalogApi';
import { checkoutApi } from '@/features/checkout/api/checkoutApi';
import { useCart } from '@/features/cart/hooks/useCart';
import { useAuth } from '@/features/auth';
import { useFavorites } from '@/features/wishlist/hooks/useFavorites';
import { ProductGallery } from '../components/ProductGallery';
import { ProductRail } from '../components/ProductRail';
import { StickyBuyBar } from '../components/StickyBuyBar';
import {
  ATTR_LABEL,
  attributesOf,
  findVariant,
  initialSelection,
  isOptionAvailable,
  selectValue,
  valuesOf,
  type VariantAttr,
  type VariantSelection,
} from '../lib/variantMatrix';
import { DiscountBadge, ErrorState, Illustration, IvaBreakdown, PriceTag, QuantityStepper, Rail, SectionHeader, StockIndicator } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';
import { formatMoney } from '@/shared/lib/formatters';
import { discountPercent, quoteShipping } from '@/shared/lib/pricing';
import { trackRecentlyViewed, useRecentlyViewed } from '@/shared/lib/recentlyViewed';

const TABS = [
  { id: 'descripcion', label: 'Descripción' },
  { id: 'especificaciones', label: 'Especificaciones' },
  { id: 'envio', label: 'Compra y envío' },
];

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const { cart, upsertItem, isUpserting } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const recientes = useRecentlyViewed(productId);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => catalogApi.getProductById(productId),
    enabled: Number.isFinite(productId) && productId > 0,
  });

  const producto = data?.producto;
  const variantes = useMemo(() => (data?.variantes ?? []).filter(v => v.Activo), [data]);
  const attrs = useMemo(() => attributesOf(variantes), [variantes]);

  const [selection, setSelection] = useState<VariantSelection>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (variantes.length > 0) setSelection(initialSelection(variantes));
  }, [variantes]);

  const variant = useMemo(() => findVariant(variantes, selection) ?? variantes[0], [variantes, selection]);

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
  }, [variant?.IDVariante]);

  useEffect(() => {
    if (producto) {
      trackRecentlyViewed({ id: producto.IDProducto, nombre: producto.Nombre, imagen: producto.ImagenUrl, categoria: producto.Categoria });
    }
  }, [producto]);

  const related = useQuery({
    queryKey: ['related', producto?.IDCategoria],
    queryFn: () => catalogApi.getProducts({ idCategoria: producto!.IDCategoria, tamanoPagina: 10, orden: 'DESTACADOS' }),
    enabled: Boolean(producto?.IDCategoria),
    staleTime: 60_000,
  });
  const relatedItems = (related.data?.items ?? []).filter(p => p.IDProducto !== productId).slice(0, 8);

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: checkoutApi.getAddresses,
    enabled: user?.rol === 'CLIENTE',
    staleTime: 60_000,
  });

  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [variant?.IDVariante]);

  if (isLoading) {
    return (
      <div className="grid animate-pulse gap-8 lg:grid-cols-2" aria-busy="true">
        <div className="aspect-square rounded-3xl bg-slate-200/70" />
        <div className="space-y-4">
          <div className="h-4 w-1/4 rounded bg-slate-200/70" />
          <div className="h-8 w-3/4 rounded bg-slate-200/70" />
          <div className="h-10 w-1/3 rounded bg-slate-200/70" />
          <div className="h-12 w-full rounded-full bg-slate-200/70" />
        </div>
      </div>
    );
  }

  if (isError || !producto || !variant) {
    const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404 || (!isError && !producto);
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <Illustration name={notFound ? 'compass' : 'wifi'} className="mx-auto" />
        <ErrorState
          className="mt-4"
          title={notFound ? 'Producto no encontrado' : 'Error al cargar el producto'}
          message={notFound ? 'Puede que ya no esté disponible.' : undefined}
          onRetry={notFound ? undefined : () => refetch()}
        />
        <Link to="/catalogo" className="mt-4 inline-block text-sm font-bold text-brand hover:underline">Volver al catálogo</Link>
      </div>
    );
  }

  const cartLine = cart?.items.find(i => i.IDVariante === variant.IDVariante);
  const inCart = cartLine?.Cantidad ?? 0;
  // Descuenta solo reservas de otros; la propia no cuenta
  const availableForMe = cartLine ? cartLine.ExistenciaDisponible : variant.ExistenciaDisponible;
  const remaining = Math.max(0, availableForMe - inCart);
  const soldOut = availableForMe <= 0;
  const noMore = !soldOut && remaining === 0;
  const pct = discountPercent(variant.PrecioReferencia, variant.Precio);
  const images = (data.imagenes && data.imagenes.length > 0 ? data.imagenes.map(i => i.Url) : producto.ImagenUrl ? [producto.ImagenUrl] : []).filter(Boolean);
  const address = addresses.data?.[0];
  const ship = address ? quoteShipping(Number(variant.Precio) * quantity, address) : null;

  const handleAdd = () => {
    if (soldOut) {
      toast.error('Sin existencia');
      return;
    }
    if (quantity > remaining) {
      toast.warning('Límite de existencia', `Solo quedan ${remaining}.`);
      return;
    }
    upsertItem(
      { idVariante: variant.IDVariante, cantidad: inCart + quantity },
      {
        onSuccess: () => {
          setAdded(true);
          toast.success('Agregado al carrito', `${producto.Nombre}${variant.Talla || variant.Color ? ` (${[variant.Talla, variant.Color].filter(Boolean).join(' / ')})` : ''}`);
        },
      },
    );
  };

  const specRows: Array<[string, string]> = [
    ['SKU', variant.SKU],
    ['Categoría', producto.Categoria],
    ...(attrs.map(a => [ATTR_LABEL[a], String(variant[a] ?? '')]) as Array<[string, string]>).filter(([, v]) => v),
    ['Existencia', `${variant.ExistenciaDisponible} unidades`],
  ];

  return (
    <div className="animate-fade-up">
      <nav aria-label="Ruta de navegación" className="mb-4 flex flex-wrap items-center gap-1 text-xs font-medium text-slate-500">
        <Link to="/" className="hover:text-brand">Inicio</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/categoria/${producto.IDCategoria}`} className="hover:text-brand">{producto.Categoria}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-bold text-slate-800" aria-current="page">{producto.Nombre}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <ProductGallery
          images={images}
          alt={producto.Nombre}
          badges={
            <>
              {pct > 0 && <DiscountBadge percent={pct} className="!text-xs !px-2 !py-1" />}
              {producto.Destacado && <span className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-white">Destacado</span>}
            </>
          }
          overlay={
            <button
              type="button"
              onClick={() => toggle(producto.IDProducto)}
              aria-pressed={isFavorite(producto.IDProducto)}
              aria-label={isFavorite(producto.IDProducto) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-110"
            >
              <Heart className={`h-5 w-5 ${isFavorite(producto.IDProducto) ? 'fill-sale text-sale animate-pop' : 'text-slate-700'}`} />
            </button>
          }
        />

        <div className="min-w-0">
          <Link to={`/categoria/${producto.IDCategoria}`} className="text-xs font-bold uppercase tracking-wider text-brand hover:underline">
            {producto.Categoria}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">{producto.Nombre}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>SKU: <span className="font-mono font-semibold text-slate-700">{variant.SKU}</span></span>
            <StockIndicator available={availableForMe} />
          </p>

          <div className="mt-5">
            <PriceTag amount={variant.Precio} compareAt={variant.PrecioReferencia} tone={pct > 0 ? 'sale' : 'default'} size="xl" />
            {pct > 0 && variant.PrecioReferencia && (
              <p className="mt-1 text-sm font-bold text-emerald-700">Ahorras {formatMoney(variant.PrecioReferencia - variant.Precio)}</p>
            )}
          </div>

          {attrs.length > 0 && variantes.length > 1 && (
            <div className="mt-6 space-y-5">
              {attrs.map((attr: VariantAttr) => (
                <fieldset key={attr}>
                  <legend className="mb-2 text-sm font-extrabold text-slate-900">
                    {ATTR_LABEL[attr]}: <span className="font-semibold text-slate-600">{selection[attr]}</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {valuesOf(variantes, attr).map(value => {
                      const active = selection[attr] === value;
                      const available = isOptionAvailable(variantes, attr, value, selection);
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelection(s => selectValue(variantes, s, attr, value))}
                          title={available ? undefined : 'Agotado'}
                          className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition ${
                            active
                              ? 'border-brand bg-brand-soft text-brand'
                              : available
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                : 'border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          <div ref={ctaRef} className="mt-7 space-y-3">
            {soldOut ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                Agotado. Elige otra opción.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <QuantityStepper value={quantity} max={Math.max(1, remaining)} onChange={setQuantity} disabled={noMore} />
                  <span className="text-xs text-slate-500">
                    {noMore ? 'Ya está en tu carrito' : `${remaining} disponibles${inCart > 0 ? ` · ${inCart} en tu carrito` : ''}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={noMore || isUpserting}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cta text-base font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpserting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                  Agregar al carrito · {formatMoney(Number(variant.Precio) * quantity)}
                </button>
              </>
            )}
            {added && (
              <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 animate-pop">
                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Agregado al carrito</span>
                <button type="button" onClick={() => navigate('/carrito')} className="font-extrabold underline">Ver carrito</button>
              </div>
            )}
          </div>

          <ul className="mt-6 space-y-3 rounded-2xl border border-slate-200 p-4 text-sm">
            <li className="flex gap-3">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <span>
                {ship && address ? (
                  <>
                    <strong>{ship.free ? 'Envío gratis' : `Envío ${formatMoney(ship.cost)}`}</strong> a {address.Municipio}, {address.Departamento}.
                    {!ship.free && ship.freeFrom != null && <> Gratis desde {formatMoney(ship.freeFrom)}.</>}
                  </>
                ) : (
                  <>Se calcula al pagar.</>
                )}
              </span>
            </li>
            {user?.rol === 'CLIENTE' && !address && !addresses.isLoading && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>
                  <Link to="/cuenta/direcciones" className="font-bold text-brand underline">Agrega una dirección</Link> para ver el costo de envío exacto.
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-14 space-y-12">
        <section id="descripcion" className="scroll-mt-28">
          <SectionHeader title="Descripción" />
          <div className="max-w-3xl space-y-3 text-sm leading-7 text-slate-700">
            {(producto.Descripcion || 'Sin descripción.')
              .split(/\n{1,}/)
              .map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>

        <section id="especificaciones" className="scroll-mt-28">
          <SectionHeader title="Especificaciones" />
          <dl className="grid max-w-3xl overflow-hidden rounded-2xl border border-slate-200 text-sm sm:grid-cols-2">
            {specRows.map(([k, v], i) => (
              <div key={k} className={`flex justify-between gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                <dt className="font-semibold text-slate-500">{k}</dt>
                <dd className="text-right font-bold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="envio" className="scroll-mt-28">
          <SectionHeader title="Compra y envío" />
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-canvas p-5">
              <h3 className="text-sm font-extrabold text-slate-900">Desglose de impuestos</h3>
              <IvaBreakdown total={Number(variant.Precio)} />
            </div>
            <div className="rounded-2xl bg-canvas p-5 text-sm text-slate-600">
              <h3 className="text-sm font-extrabold text-slate-900">Envío gratis</h3>
              <p className="mt-2 leading-6">
                Desde el monto mínimo de tu departamento, con descuento aplicado.
              </p>
            </div>
          </div>
        </section>

        <ProductRail
          title={`Más de ${producto.Categoria}`}
          products={relatedItems}
          to={`/categoria/${producto.IDCategoria}`}
          loading={related.isLoading}
        />

        {recientes.length > 0 && (
          <section aria-label="Vistos recientemente">
            <SectionHeader title="Vistos recientemente" />
            <Rail ariaLabel="Vistos recientemente">
              {recientes.slice(0, 10).map(p => (
                <Link key={p.id} to={`/producto/${p.id}`} className="group block w-36 sm:w-40">
                  <span className="block aspect-square overflow-hidden rounded-card bg-canvas">
                    {p.imagen && <img src={p.imagen} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-xs font-semibold text-slate-700 group-hover:text-brand">{p.nombre}</span>
                </Link>
              ))}
            </Rail>
          </section>
        )}
      </div>

      <StickyBuyBar
        visible={!ctaVisible}
        name={producto.Nombre}
        price={Number(variant.Precio)}
        compareAt={variant.PrecioReferencia}
        disabled={soldOut || noMore}
        loading={isUpserting}
        onAdd={handleAdd}
        tabs={TABS}
      />
    </div>
  );
};
