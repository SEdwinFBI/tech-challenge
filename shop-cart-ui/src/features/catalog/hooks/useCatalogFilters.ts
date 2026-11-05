import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { GetProductsParams } from '../api/catalogApi';

export type CatalogMode = 'all' | 'ofertas' | 'novedades' | 'categoria';
export type CatalogOrder = NonNullable<GetProductsParams['orden']>;

export const PAGE_SIZE = 12;

export const ORDER_OPTIONS: Array<{ value: CatalogOrder; label: string }> = [
  { value: 'RECIENTES', label: 'Más recientes' },
  { value: 'MAS_VENDIDOS', label: 'Más vendidos' },
  { value: 'DESTACADOS', label: 'Destacados' },
  { value: 'PRECIO_ASC', label: 'Precio: menor a mayor' },
  { value: 'PRECIO_DESC', label: 'Precio: mayor a menor' },
  { value: 'NOMBRE_ASC', label: 'Nombre A-Z' },
];

export interface CatalogFilters {
  q: string;
  categoria?: number;
  min?: number;
  max?: number;
  disp: boolean;
  ofertas: boolean;
  nuevos: boolean;
  orden: CatalogOrder;
  pagina: number;
}

const ORDER_VALUES = new Set<string>(ORDER_OPTIONS.map(o => o.value));

function positive(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Filtros en la URL: compartibles y con botón atrás
export function useCatalogFilters(mode: CatalogMode, routeCategoryId?: number) {
  const [sp, setSp] = useSearchParams();

  const filters = useMemo<CatalogFilters>(() => {
    const ordenRaw = sp.get('orden') ?? '';
    let min = positive(sp.get('min'));
    let max = positive(sp.get('max'));
    if (min != null && max != null && min > max) [min, max] = [max, min];
    const cat = positive(sp.get('categoria'));
    const pagina = Math.max(1, Math.floor(positive(sp.get('pagina')) ?? 1));
    return {
      q: sp.get('q') ?? '',
      categoria: mode === 'categoria' ? routeCategoryId : cat && cat > 0 ? cat : undefined,
      min,
      max: max && max > 0 ? max : undefined,
      disp: sp.get('disp') === 'true',
      ofertas: mode === 'ofertas' || sp.get('ofertas') === 'true',
      nuevos: mode === 'novedades' || sp.get('nuevos') === 'true',
      orden: (ORDER_VALUES.has(ordenRaw) ? ordenRaw : 'RECIENTES') as CatalogOrder,
      pagina,
    };
  }, [sp, mode, routeCategoryId]);

  const params = useMemo<GetProductsParams>(
    () => ({
      q: filters.q.trim() || undefined,
      idCategoria: filters.categoria,
      precioMin: filters.min,
      precioMax: filters.max,
      soloDisponibles: filters.disp ? 'true' : undefined,
      soloOfertas: filters.ofertas ? 'true' : undefined,
      soloNuevos: filters.nuevos ? 'true' : undefined,
      orden: filters.orden,
      pagina: filters.pagina,
      tamanoPagina: PAGE_SIZE,
    }),
    [filters],
  );

  const set = useCallback(
    (patch: Partial<Record<keyof CatalogFilters, string | number | boolean | undefined | null>>, keepPage = false) => {
      const next = new URLSearchParams(sp);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '' || v === false) next.delete(k);
        else next.set(k, String(v));
      }
      if (!keepPage) next.delete('pagina');
      setSp(next, { replace: false });
    },
    [sp, setSp],
  );

  const clear = useCallback(() => setSp(new URLSearchParams(), { replace: false }), [setSp]);

  const activeCount =
    (filters.q ? 1 : 0) +
    (mode !== 'categoria' && filters.categoria ? 1 : 0) +
    (filters.min != null || filters.max != null ? 1 : 0) +
    (filters.disp ? 1 : 0) +
    (mode !== 'ofertas' && filters.ofertas ? 1 : 0) +
    (mode !== 'novedades' && filters.nuevos ? 1 : 0);

  return { filters, params, set, clear, activeCount };
}
