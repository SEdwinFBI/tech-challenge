import React, { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { ordersApi, type OrderSortColumn } from '../api/ordersApi';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import { dateRangeToIso, numberOrUndefined, type FilterDef } from '@/shared/lib/columnFilters';
import { formatMoney, formatDateTime } from '@/shared/lib/formatters';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableMessageRow,
  SortableHead,
  FilterChips,
  getOrderStatusBadge,
  Pagination,
  TableRowsSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  Button,
} from '@/shared/ui';
import { Search, Eye } from 'lucide-react';

const ESTADOS = [
  { value: 'PAGADO', label: 'Pagado' },
  { value: 'EN_PREPARACION', label: 'En preparación' },
  { value: 'DESPACHADO', label: 'Despachado' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'DEVUELTO_PARCIAL', label: 'Devolución parcial' },
  { value: 'DEVUELTO_TOTAL', label: 'Devuelto' },
];

const FILTROS = ['estado', 'cliente', 'desde', 'hasta', 'totalMin', 'totalMax'] as const;

const DEFS: Record<'estado' | 'cliente' | 'fecha' | 'total', FilterDef> = {
  estado: { type: 'opciones', key: 'estado', label: 'Estado', options: ESTADOS },
  cliente: { type: 'texto', key: 'cliente', label: 'Cliente', placeholder: 'Nombre o correo' },
  fecha: { type: 'fechas', keyDesde: 'desde', keyHasta: 'hasta', label: 'Fecha' },
  total: { type: 'rango', keyMin: 'totalMin', keyMax: 'totalMax', label: 'Total', prefix: 'Q' },
};

export const AdminOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const search = searchParams.get('search') || '';

  const resetPage = useMemo(
    () => () =>
      setSearchParams((prev) => {
        prev.set('page', '1');
        return prev;
      }),
    [setSearchParams],
  );

  const { sort, toggle } = useSort<OrderSortColumn>({ orden: 'fecha', direccion: 'desc' }, resetPage);
  const { values: f, patch, clearAll, anyActive } = useColumnFilters(FILTROS, resetPage);

  const totalMinN = numberOrUndefined(f.totalMin);
  const totalMaxN = numberOrUndefined(f.totalMax);
  const rangeInvalid = totalMinN !== undefined && totalMaxN !== undefined && totalMinN > totalMaxN;

  const { data, isLoading, isError, isPaused, failureCount, refetch } = useQuery({
    queryKey: ['admin-orders', page, search, f, rangeInvalid, sort.orden, sort.direccion],
    queryFn: () =>
      ordersApi.getOrders({
        pagina: page,
        tamanoPagina: 15,
        estado: f.estado || undefined,
        cliente: f.cliente.trim() || undefined,
        numeroSeguimiento: search.trim() || undefined,
        ...dateRangeToIso(f.desde, f.hasta),
        totalMin: rangeInvalid ? undefined : totalMinN,
        totalMax: rangeInvalid ? undefined : totalMaxN,
        orden: sort.orden,
        direccion: sort.direccion,
      }),
    placeholderData: keepPreviousData,
  });

  const orders = data?.datos || [];
  const filtered = anyActive || search !== '';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      if (val) {
        prev.set('search', val);
      } else {
        prev.delete('search');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const clearEverything = () => {
    clearAll();
    setSearchParams({});
  };

  const filterOf = (key: keyof typeof DEFS) => ({ def: DEFS[key], values: f, onChange: patch });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
      />

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar pedido"
            aria-label="Buscar pedido"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <FilterChips defs={Object.values(DEFS)} values={f} onChange={patch} onClearAll={clearAll} />

      {rangeInvalid && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          El total mínimo no puede ser mayor al máximo. Ese filtro no se aplicó.
        </p>
      )}

      {isPaused || isError || failureCount > 0 ? (
        <ErrorState
          title={isPaused ? 'Sin conexión' : 'Error al cargar pedidos'}
          message={isPaused
            ? 'No se puede actualizar la búsqueda sin conexión. Los resultados se cargarán al reconectarte.'
            : 'No se pudieron actualizar los pedidos. Reintenta la búsqueda.'}
          onRetry={() => { void refetch(); }}
        />
      ) : !isLoading && orders.length === 0 && !filtered ? (
        <EmptyState title="Sin pedidos" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seguimiento</TableHead>
                <SortableHead column="cliente" sort={sort} onSort={toggle} filter={filterOf('cliente')}>Cliente</SortableHead>
                <SortableHead column="fecha" sort={sort} onSort={toggle} filter={filterOf('fecha')}>Fecha</SortableHead>
                <SortableHead column="total" sort={sort} onSort={toggle} filter={filterOf('total')}>Total</SortableHead>
                <SortableHead column="estado" sort={sort} onSort={toggle} filter={filterOf('estado')}>Estado</SortableHead>
                <TableHead className="text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton rows={8} cols={6} />
              ) : orders.length === 0 ? (
                <TableMessageRow colSpan={6}>
                  Ningún pedido coincide con los filtros.{' '}
                  <button type="button" onClick={clearEverything} className="font-semibold text-indigo-700 hover:underline">
                    Ver todos
                  </button>
                </TableMessageRow>
              ) : (
                orders.map((ord) => (
                  <TableRow key={ord.IDPedido}>
                    <TableCell className="font-mono text-xs font-bold text-indigo-700">
                      {ord.NumeroSeguimiento}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-800 text-xs sm:text-sm">{ord.Cliente}</p>
                      <p className="text-[11px] text-slate-400">{ord.Correo}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(ord.FechaCreacion)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 text-sm">
                      {formatMoney(ord.Total)}
                    </TableCell>
                    <TableCell>{getOrderStatusBadge(ord.Estado)}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/admin/pedidos/${ord.IDPedido}`}>
                        <Button variant="outline" size="sm" leftIcon={<Eye className="w-3.5 h-3.5 mr-1" />}>
                          Gestionar
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && orders.length > 0 && (
            <Pagination
              currentPage={data.pagina}
              totalRecords={data.total}
              pageSize={data.tamanoPagina}
              onPageChange={(p) =>
                setSearchParams((prev) => {
                  prev.set('page', String(p));
                  return prev;
                })
              }
            />
          )}
        </>
      )}
    </div>
  );
};
