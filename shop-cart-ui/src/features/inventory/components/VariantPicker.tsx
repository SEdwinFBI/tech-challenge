import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { catalogApi } from '@/features/catalog';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { SafeImage } from '@/shared/ui/SafeImage';
import { queryKeys } from '@/shared/lib/queryKeys';

export interface VariantInfo {
  idVariante: number;
  sku: string;
  producto: string;
  atributos: string;
  existenciaFisica: number;
  existenciaDisponible: number;
}

export interface VariantPickerProps {
  value: VariantInfo | null;
  onChange: (v: VariantInfo | null) => void;
  label?: string;
}

/** Primero se busca el producto y luego la variante. */
export const VariantPicker: React.FC<VariantPickerProps> = ({ value, onChange, label = 'Producto y variante' }) => {
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term.trim(), 300);
  const [productId, setProductId] = useState<number | null>(null);

  const products = useQuery({
    queryKey: queryKeys.inventory.picker(debounced),
    queryFn: () => catalogApi.getProducts({ q: debounced || undefined, tamanoPagina: 8, orden: 'NOMBRE_ASC' }),
    enabled: !value,
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0,
  });

  const detail = useQuery({
    queryKey: queryKeys.inventory.product(productId),
    queryFn: () => catalogApi.getProductInventory(productId!),
    enabled: productId !== null && !value,
    staleTime: 0,
    gcTime: 0,
  });

  if (value) {
    return (
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</span>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand bg-brand-soft/60 px-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="truncate font-bold text-slate-900">{value.producto}</p>
            <p className="text-xs text-slate-600">
              <span className="font-mono font-bold">{value.sku}</span>
              {value.atributos && <> · {value.atributos}</>} · Existencia {value.existenciaFisica} · Disponible {value.existenciaDisponible}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setProductId(null);
            }}
            aria-label="Cambiar variante"
            className="rounded-full p-1.5 text-slate-500 hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</span>
      {productId === null ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Busca por nombre o SKU"
              aria-label="Buscar producto"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {products.isLoading && <li className="px-4 py-3 text-sm text-slate-500">Buscando…</li>}
            {!products.isLoading && (products.data?.items ?? []).length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Sin resultados.</li>}
            {(products.data?.items ?? []).map(p => (
              <li key={p.IDProducto}>
                <button type="button" onClick={() => setProductId(p.IDProducto)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                  <SafeImage src={p.ImagenUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{p.Nombre}</span>
                    <span className="block text-xs text-slate-500">{p.Categoria}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="truncate text-sm font-bold text-slate-800">{detail.data?.producto?.Nombre ?? (detail.isError ? 'Producto seleccionado' : 'Cargando…')}</p>
            <button type="button" onClick={() => setProductId(null)} className="text-xs font-bold text-brand hover:underline">Cambiar producto</button>
          </div>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
            {detail.isLoading && <li className="px-4 py-3 text-sm text-slate-500">Cargando variantes…</li>}
            {detail.isError && <li className="px-4 py-3 text-sm text-rose-700" role="alert">
              No se pudieron cargar las variantes.
              <button type="button" onClick={() => detail.refetch()} className="ml-2 font-bold underline">Reintentar</button>
            </li>}
            {detail.isSuccess && detail.data.variantes.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Sin variantes.</li>}
            {(detail.data?.variantes ?? []).map(v => (
              <li key={v.IDVariante}>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      idVariante: v.IDVariante,
                      sku: v.SKU,
                      producto: detail.data?.producto?.Nombre ?? '',
                      atributos: [v.Talla, v.Color, v.Presentacion].filter(Boolean).join(' · '),
                      existenciaFisica: v.ExistenciaFisica,
                      existenciaDisponible: v.ExistenciaDisponible,
                    })
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="min-w-0 text-sm">
                    <span className="font-mono text-xs font-bold text-slate-800">{v.SKU}</span>
                    <span className="ml-2 text-xs text-slate-500">{[v.Talla, v.Color, v.Presentacion].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular text-slate-500">Existencia {v.ExistenciaFisica} · Disponible {v.ExistenciaDisponible}{v.Activo ? '' : ' · inactiva'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
