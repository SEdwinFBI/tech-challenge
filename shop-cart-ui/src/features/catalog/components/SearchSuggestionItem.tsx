import { SafeImage } from '@/shared/ui/SafeImage';
import { PriceTag } from '@/shared/ui/PriceTag';
import type { ProductListItem } from '@/shared/types/domain';

interface Props { product: ProductListItem; onSelect: (id: number) => void; recommended?: boolean }

export function SearchSuggestionItem({ product, onSelect, recommended = false }: Props) {
  return <button type="button" onClick={() => onSelect(product.IDProducto)}
    aria-label={recommended ? `Ver recomendación: ${product.Nombre}` : product.Nombre}
    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">
    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-canvas">
      <SafeImage src={product.ImagenUrl} alt="" className="h-full w-full object-cover" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-slate-800">{product.Nombre}</span>
      <span className="block truncate text-xs text-slate-500">{product.Categoria}</span>
    </span>
    <PriceTag amount={product.PrecioOferta ?? product.PrecioMinimo} size="sm" tone={product.PrecioOferta ? 'sale' : 'default'} />
  </button>;
}
