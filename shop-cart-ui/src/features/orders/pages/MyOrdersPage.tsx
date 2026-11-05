import React, { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Package } from 'lucide-react';
import { ordersApi } from '../api/ordersApi';
import { ErrorState, Illustration, NumberedPagination, getOrderStatusBadge } from '@/shared/ui';
import { formatDate, formatMoney } from '@/shared/lib/formatters';
import { HAPPY_PATH, happyPathIndex } from '@/shared/lib/orderStatus';

const PAGE_SIZE = 10;
const FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'PAGADO', label: 'Pagados' },
  { value: 'EN_PREPARACION', label: 'En preparación' },
  { value: 'DESPACHADO', label: 'Despachados' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

const Progress: React.FC<{ status: string }> = ({ status }) => {
  const idx = happyPathIndex(status);
  if (idx < 0) return null;
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
      {HAPPY_PATH.map((s, i) => (
        <span key={s.code} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-brand' : 'bg-slate-200'}`} title={s.label} />
      ))}
    </div>
  );
};

export const MyOrdersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('');

  const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['my-orders', page, estado],
    queryFn: () => ordersApi.getOrders({ pagina: page, tamanoPagina: PAGE_SIZE, estado: estado || undefined }),
    placeholderData: keepPreviousData,
  });

  const orders = data?.datos ?? [];

  return (
    <div className="animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-slate-900">Mis pedidos</h1>

      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por estado">
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            aria-pressed={estado === f.value}
            onClick={() => {
              setEstado(f.value);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
              estado === f.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
      ) : isError && !data ? (
        <ErrorState title="Error al cargar pedidos" onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-canvas px-6 py-14 text-center">
          <Illustration name="box" />
          <h2 className="mt-4 text-lg font-extrabold text-slate-900">{estado ? 'No hay pedidos' : 'Sin pedidos'}</h2>
          <Link to="/catalogo" className="mt-5 inline-flex h-11 items-center rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
            Ver productos
          </Link>
        </div>
      ) : (
        <ul className={`space-y-3 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {orders.map(o => (
            <li key={o.IDPedido}>
              <Link
                to={`/cuenta/pedidos/${o.IDPedido}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand hover:shadow-card sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand"><Package className="h-5 w-5" /></span>
                    <div>
                      <p className="font-mono text-sm font-extrabold tracking-wide text-slate-900">{o.NumeroSeguimiento}</p>
                      <p className="text-xs text-slate-500">Comprado el {formatDate(o.FechaCreacion)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getOrderStatusBadge(o.Estado)}
                    <p className="mt-1 text-base font-extrabold tabular text-slate-900">{formatMoney(o.Total)}</p>
                  </div>
                </div>
                <Progress status={o.Estado} />
                <p className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-brand">
                  Ver detalle <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NumberedPagination className="mt-8" page={page} pageSize={PAGE_SIZE} totalRecords={data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
};
