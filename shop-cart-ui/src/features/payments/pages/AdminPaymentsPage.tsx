import React, { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { paymentsApi, type PaymentStatus } from '../api/paymentsApi';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import type { FilterDef } from '@/shared/lib/columnFilters';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { formatDateTime, formatMoney } from '@/shared/lib/formatters';
import {
  Badge,
  EmptyState,
  FilterableHead,
  FilterChips,
  PageHeader,
  Pagination,
  SortableHead,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableMessageRow,
  TableRow,
  TableRowsSkeleton,
} from '@/shared/ui';

const ESTADOS: Record<PaymentStatus, { label: string; variant: 'info' | 'success' | 'error' | 'neutral' | 'warning' }> = {
  AUTORIZADO: { label: 'Autorizado', variant: 'info' },
  CAPTURADO: { label: 'Cobrado', variant: 'success' },
  RECHAZADO: { label: 'Rechazado', variant: 'error' },
  ANULADO: { label: 'Anulado', variant: 'neutral' },
  PENDIENTE_CONCILIACION: { label: 'En conciliación', variant: 'warning' },
};

const FILTROS = ['estado'] as const;
const DEFS: Record<'estado', FilterDef> = {
  estado: {
    type: 'opciones',
    key: 'estado',
    label: 'Estado',
    options: Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.label })),
    allLabel: 'Todos los estados',
  },
};

export const AdminPaymentsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const resetPage = useCallback(() => setPage(1), []);
  const { values: f, patch, clearAll, anyActive } = useColumnFilters(FILTROS, resetPage);
  const { sort, toggle } = useSort<'fecha'>({ orden: 'fecha', direccion: 'desc' }, resetPage);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-payments', page, f, sort.direccion],
    placeholderData: keepPreviousData,
    queryFn: () =>
      paymentsApi.getPayments({
        pagina: page,
        tamanoPagina: 15,
        direccion: sort.direccion,
        estado: (f.estado || undefined) as PaymentStatus | undefined,
      }),
  });

  const payments = data?.datos ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Pagos" description="Intentos de cobro y su estado." />

      <FilterChips defs={Object.values(DEFS)} values={f} onChange={patch} onClearAll={clearAll} />

      {!isLoading && !isError && payments.length === 0 && !anyActive ? (
        <EmptyState title="Sin pagos" description="Todavía no hay intentos de pago." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead column="fecha" sort={sort} onSort={toggle}>Fecha</SortableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Monto</TableHead>
                <FilterableHead filter={{ def: DEFS.estado, values: f, onChange: patch }}>Estado</FilterableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton rows={8} cols={6} />
              ) : isError ? (
                <TableMessageRow colSpan={6}>
                  {apiErrorMessage(error, 'No se pudieron cargar los pagos.')}{' '}
                  <button type="button" onClick={() => { void refetch(); }} className="font-semibold text-indigo-700 hover:underline">
                    Reintentar
                  </button>
                </TableMessageRow>
              ) : payments.length === 0 ? (
                <TableMessageRow colSpan={6}>Ningún pago coincide con los filtros.</TableMessageRow>
              ) : (
                payments.map((p) => {
                  const estado = ESTADOS[p.Estado] ?? { label: p.Estado, variant: 'neutral' as const };
                  return (
                    <TableRow key={p.IDIntentoPago}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(p.FechaCreacion)}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">{p.Correo}</TableCell>
                      <TableCell className="font-semibold tabular text-slate-900">{formatMoney(p.Monto)}</TableCell>
                      <TableCell>
                        <Badge variant={estado.variant} size="sm">{estado.label}</Badge>
                        {p.Detalle && <span className="mt-0.5 block max-w-56 truncate text-[11px] text-slate-400" title={p.Detalle}>{p.Detalle}</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{p.ReferenciaPasarela ?? '—'}</TableCell>
                      <TableCell>
                        {p.IDPedido ? (
                          <Link to={`/admin/pedidos/${p.IDPedido}`} className="font-mono text-xs font-bold text-indigo-700 hover:underline">
                            #{p.IDPedido}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {data && (
            <Pagination currentPage={data.pagina} totalRecords={data.total} pageSize={data.tamanoPagina} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
};
