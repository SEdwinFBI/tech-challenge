import React from 'react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { SafeImage } from '@/shared/ui/SafeImage';
import { Link } from 'react-router';
import { Heart, ImageOff, Loader2, ShoppingCart } from 'lucide-react';
import type { ProductListItem } from '@/shared/types/domain';
import { PriceTag, DiscountBadge } from '@/shared/ui/PriceTag';
import { StockIndicator } from '@/shared/ui/StockIndicator';
import { useFavorites } from '@/features/wishlist/hooks/useFavorites';
import { useQuickAdd } from '../hooks/useQuickAdd';

export interface ProductCardProps {
  product: ProductListItem;
  variant?: 'grid' | 'compact';
}

const NEW_DAYS = 7;

function isNew(fecha?: string): boolean {
  if (!fecha) return false;
  const t = new Date(fecha).getTime();
  return Number.isFinite(t) && Date.now() - t < NEW_DAYS * 86_400_000;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, variant = 'grid' }) => {
  const online = useOnlineStatus();
  const { isFavorite, toggle } = useFavorites();
  const { add, pendingId } = useQuickAdd();
  const fav = isFavorite(product.IDProducto);
  const soldOut = product.StockTotalDisponible <= 0;
  const onSale = Boolean(product.PorcentajeDescuento && product.PrecioReferencia && product.PrecioOferta);
  const adding = pendingId === product.IDProducto;
  const to = `/producto/${product.IDProducto}`;

  return (
    <article
      className={`group relative flex h-full flex-col ${variant === 'compact' ? 'w-44 sm:w-52' : 'w-full'}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-card bg-canvas">
        <Link to={to} className="block h-full w-full" aria-label={`Ver ${product.Nombre}`} tabIndex={-1}>
          {product.ImagenUrl ? (
            <SafeImage
              src={product.ImagenUrl}
              alt={product.Nombre}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? 'opacity-50 grayscale' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {onSale && <DiscountBadge percent={product.PorcentajeDescuento ?? 0} />}
          {!onSale && isNew(product.FechaCreacion) && (
            <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm">Nuevo</span>
          )}
          {soldOut && (
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">Agotado</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle(product.IDProducto)}
          aria-pressed={fav}
          aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
        >
          <Heart className={`h-[18px] w-[18px] transition ${fav ? 'fill-sale text-sale animate-pop' : ''}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{product.Categoria}</p>
        <Link to={to} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800 hover:text-brand">
          {product.Nombre}
        </Link>

        {onSale ? (
          <PriceTag amount={product.PrecioOferta} compareAt={product.PrecioReferencia} tone="sale" size="md" />
        ) : (
          <PriceTag amount={product.PrecioMinimo} from={product.PrecioMaximo > product.PrecioMinimo} size="md" />
        )}

        <div className="min-h-4">
          {!soldOut && product.StockTotalDisponible <= 5 && <StockIndicator available={product.StockTotalDisponible} />}
        </div>

        <button
          type="button"
          disabled={soldOut || adding || !online}
          title={online ? undefined : 'Sin conexión'}
          onClick={() => add(product.IDProducto)}
          className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-800 shadow-xs transition hover:border-brand hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-800"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          {soldOut ? 'Sin existencia' : 'Agregar'}
        </button>
      </div>
    </article>
  );
};

export const ProductCardSkeletonV2: React.FC = () => (
  <div className="w-full animate-pulse" aria-hidden="true">
    <div className="aspect-square rounded-card bg-slate-200/70" />
    <div className="mt-3 space-y-2">
      <div className="h-3 w-1/3 rounded bg-slate-200/70" />
      <div className="h-4 w-4/5 rounded bg-slate-200/70" />
      <div className="h-5 w-1/2 rounded bg-slate-200/70" />
      <div className="h-10 w-full rounded-full bg-slate-200/70" />
    </div>
  </div>
);
