import React, { useCallback, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, PackagePlus, Plus } from 'lucide-react';
import { inventoryApi, type KardexSortColumn, type LowStockSortColumn } from '../api/inventoryApi';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import { dateRangeToIso, type FilterDef } from '@/shared/lib/columnFilters';
import { VariantPicker, type VariantInfo } from '../components/VariantPicker';
import { formatDateTime } from '@/shared/lib/formatters';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableMessageRow,
  SortableHead,
  FilterChips,
  TableHead,
  TableHeader,
  TableRow,
  TableRowsSkeleton,
} from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage } from '@/shared/lib/apiErrors';

type Tab = 'kardex' | 'bajas';
type Tipo = 'ENTRADA_COMPRA' | 'AJUSTE';

const TIPO_LABEL: Record<string, string> = {
  ENTRADA_COMPRA: 'Entrada por compra',
  SALIDA_VENTA: 'Salida por venta',
  AJUSTE_POSITIVO: 'Ajuste (+)',
  AJUSTE_NEGATIVO: 'Ajuste (−)',
  AJUSTE_FISICO: 'Ajuste físico',
  SALIDA_MERMA: 'Merma',
  DEVOLUCION_CLIENTE: 'Devolución de cliente',
  CANCELACION: 'Cancelación',
};

const TIPOS_KARDEX = ['ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION_CLIENTE'];

const KARDEX_FILTROS = ['tipo', 'desde', 'hasta'] as const;
const KARDEX_DEFS: Record<'tipo' | 'fecha', FilterDef> = {
  tipo: { type: 'opciones', key: 'tipo', label: 'Tipo', options: TIPOS_KARDEX.map(c => ({ value: c, label: TIPO_LABEL[c] })) },
  fecha: { type: 'fechas', keyDesde: 'desde', keyHasta: 'hasta', label: 'Fecha' },
};

const BAJAS_FILTROS = ['q'] as const;
const BAJAS_DEF: FilterDef = { type: 'texto', key: 'q', label: 'SKU / Producto', placeholder: 'SKU o nombre' };

export const AdminInventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('kardex');

  // Kardex: paginado y filtros (variante, tipo, fechas) en servidor
  const [page, setPage] = useState(1);
  const [filterVariant, setFilterVariant] = useState<VariantInfo | null>(null);
  const resetKardexPage = useCallback(() => setPage(1), []);
  const { values: kf, patch: patchKardex, clearAll: clearKardex } = useColumnFilters(KARDEX_FILTROS, resetKardexPage);
  const { sort, toggle } = useSort<KardexSortColumn>({ orden: 'fecha', direccion: 'desc' }, resetKardexPage);
  const kardex = useQuery({
    queryKey: ['kardex', page, filterVariant?.idVariante ?? null, kf, sort.orden, sort.direccion],
    placeholderData: keepPreviousData,
    queryFn: () =>
      inventoryApi.getKardex({
        pagina: page,
        tamanoPagina: 15,
        orden: sort.orden,
        direccion: sort.direccion,
        idVariante: filterVariant?.idVariante,
        tipoMovimiento: kf.tipo || undefined,
        ...dateRangeToIso(kf.desde, kf.hasta),
      }),
  });
  const movements = kardex.data?.movimientos ?? [];
  const kardexFiltered = Boolean(kf.tipo || kf.desde || kf.hasta);

  const [lowPage, setLowPage] = useState(1);
  const resetLowPage = useCallback(() => setLowPage(1), []);
  const { values: lf, patch: patchLow, clearAll: clearLow } = useColumnFilters(BAJAS_FILTROS, resetLowPage);
  const { sort: lowSort, toggle: toggleLowSort } = useSort<LowStockSortColumn>({ orden: 'existencia', direccion: 'asc' }, resetLowPage);
  const low = useQuery({
    queryKey: ['low-stock', lowPage, lf, lowSort.orden, lowSort.direccion],
    queryFn: () =>
      inventoryApi.getLowStock({ q: lf.q.trim() || undefined, orden: lowSort.orden, direccion: lowSort.direccion, pagina: lowPage, tamanoPagina: 15 }),
    placeholderData: keepPreviousData,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [variant, setVariant] = useState<VariantInfo | null>(null);
  const [tipo, setTipo] = useState<Tipo>('ENTRADA_COMPRA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');

  const openMovement = (prefill: VariantInfo | null, defaultTipo: Tipo = 'ENTRADA_COMPRA') => {
    setVariant(prefill);
    setTipo(defaultTipo);
    setCantidad('');
    setMotivo('');
    setModalOpen(true);
  };

  const qty = Number(cantidad);
  const delta = tipo === 'ENTRADA_COMPRA' ? Math.abs(qty) : qty;
  const resulting = variant && Number.isFinite(qty) && cantidad !== '' ? variant.existenciaFisica + delta : null;
  const invalidQty = cantidad === '' || !Number.isFinite(qty) || qty === 0 || (tipo === 'ENTRADA_COMPRA' && qty < 0);
  const negative = resulting !== null && resulting < 0;
  const motivoOk = motivo.trim().length >= 5;

  const mutation = useMutation({
    mutationFn: inventoryApi.createMovement,
    onSuccess: res => {
      toast.success('Movimiento registrado en el kardex', `Nuevo saldo en bodega: ${res.saldoPosterior} unidades.`);
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['kardex'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product'] });
      queryClient.invalidateQueries({ queryKey: ['admin-catalog-products'] });
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'No se pudo registrar el movimiento. Revisa que el ajuste no deje la existencia en negativo.');
      toast.error('Error de inventario', msg);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant) return toast.error('Elige un producto y una variante');
    if (invalidQty) return toast.error('Ingresa una cantidad válida', tipo === 'ENTRADA_COMPRA' ? 'La entrada debe ser mayor a cero.' : 'El ajuste no puede ser cero.');
    if (negative) return toast.error('El ajuste dejaría la existencia en negativo');
    if (!motivoOk) return toast.error('Motivo obligatorio', 'Escribe una justificación de al menos 5 caracteres.');
    mutation.mutate({ idVariante: variant.idVariante, tipoMovimiento: tipo, cantidad: delta, motivo: motivo.trim() });
  };

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'kardex', label: 'Kardex' },
    { id: 'bajas', label: 'Existencias bajas', badge: low.data?.totalRegistros },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Cada movimiento guarda usuario, fecha y motivo. La existencia siempre cuadra con el kardex."
        action={
          <Button size="sm" onClick={() => openMovement(null)} leftIcon={<Plus className="mr-1 h-4 w-4" />}>
            Registrar movimiento
          </Button>
        }
      />

      <div role="tablist" className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-800">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'kardex' ? (
        <>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <VariantPicker
              label="Filtrar por variante (opcional)"
              value={filterVariant}
              onChange={v => {
                setFilterVariant(v);
                setPage(1);
              }}
            />
          </div>

          <FilterChips defs={Object.values(KARDEX_DEFS)} values={kf} onChange={patchKardex} onClearAll={clearKardex} />

          {kardex.isError ? (
            <ErrorState title="No pudimos cargar el kardex" onRetry={() => kardex.refetch()} />
          ) : !kardex.isLoading && movements.length === 0 && !filterVariant && !kardexFiltered ? (
            <EmptyState title="Sin movimientos" description="Todavía no hay transacciones en el kardex." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="fecha" sort={sort} onSort={toggle} filter={{ def: KARDEX_DEFS.fecha, values: kf, onChange: patchKardex }}>Fecha</SortableHead>
                    <TableHead>SKU / Producto</TableHead>
                    <SortableHead column="tipo" sort={sort} onSort={toggle} filter={{ def: KARDEX_DEFS.tipo, values: kf, onChange: patchKardex }}>Tipo</SortableHead>
                    <SortableHead column="cantidad" sort={sort} onSort={toggle}>Variación</SortableHead>
                    <TableHead>Saldo en bodega</TableHead>
                    <TableHead>Responsable / Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kardex.isLoading ? (
                    <TableRowsSkeleton rows={8} cols={6} />
                  ) : movements.length === 0 ? (
                    <TableMessageRow colSpan={6}>
                      {filterVariant && !kardexFiltered ? 'Esta variante aún no tiene movimientos.' : 'Ningún movimiento coincide con los filtros.'}
                    </TableMessageRow>
                  ) : (
                    movements.map(m => {
                      const positive = m.Cantidad > 0;
                      return (
                        <TableRow key={m.IDKardex}>
                          <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(m.FechaMovimiento)}</TableCell>
                          <TableCell>
                            <p className="font-mono text-xs font-bold text-slate-800">{m.SKU}</p>
                            <p className="text-xs text-slate-500">{m.Producto}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={positive ? 'success' : 'neutral'} size="sm">{TIPO_LABEL[m.TipoMovimiento] ?? m.TipoMovimiento}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-1 text-sm font-extrabold tabular ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              {positive ? `+${m.Cantidad}` : m.Cantidad}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-bold tabular text-slate-900">{m.SaldoPosterior} uds.</TableCell>
                          <TableCell className="text-xs">
                            <p className="font-semibold text-slate-700">{m.UsuarioOperador}</p>
                            <p className="mt-0.5 max-w-xs truncate italic text-slate-500">{m.Motivo}</p>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {kardex.data && movements.length > 0 && <Pagination currentPage={kardex.data.pagina} totalRecords={kardex.data.totalRegistros} pageSize={kardex.data.tamanoPagina} onPageChange={setPage} />}
            </>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Variantes activas con existencia disponible igual o menor al umbral configurado
              {low.data?.items[0] ? <> (<strong>{low.data.items[0].UmbralAplicado}</strong> unidades)</> : null}. Incluye las agotadas.</span>
            </p>
          </div>

          <FilterChips defs={[BAJAS_DEF]} values={lf} onChange={patchLow} onClearAll={clearLow} />

          {low.isError ? (
            <ErrorState title="No pudimos cargar las existencias bajas" onRetry={() => low.refetch()} />
          ) : !low.isLoading && (low.data?.items.length ?? 0) === 0 && !lf.q ? (
            <EmptyState title="Todo en orden" description="Ninguna variante está por debajo del umbral de existencias." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="sku" sort={lowSort} onSort={toggleLowSort} filter={{ def: BAJAS_DEF, values: lf, onChange: patchLow }}>SKU / Producto</SortableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>En bodega</TableHead>
                    <TableHead>Apartadas</TableHead>
                    <SortableHead column="existencia" sort={lowSort} onSort={toggleLowSort}>Disponible</SortableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {low.isLoading ? (
                    <TableRowsSkeleton rows={6} cols={6} />
                  ) : (low.data?.items.length ?? 0) === 0 ? (
                    <TableMessageRow colSpan={6}>Ninguna variante coincide con la búsqueda.</TableMessageRow>
                  ) : (
                    low.data!.items.map(i => (
                      <TableRow key={i.IDVariante}>
                        <TableCell>
                          <p className="font-mono text-xs font-bold text-slate-800">{i.SKU}</p>
                          <p className="text-xs text-slate-500">{i.Producto}{[i.Talla, i.Color].filter(Boolean).length > 0 && ` · ${[i.Talla, i.Color].filter(Boolean).join(' · ')}`}</p>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{i.Categoria}</TableCell>
                        <TableCell className="tabular text-sm">{i.ExistenciaFisica}</TableCell>
                        <TableCell className="tabular text-sm text-slate-500">{i.UnidadesReservadas}</TableCell>
                        <TableCell>
                          <Badge variant={i.ExistenciaDisponible <= 0 ? 'error' : 'warning'} size="sm">
                            {i.ExistenciaDisponible <= 0 ? 'Agotado' : `${i.ExistenciaDisponible} disp.`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<PackagePlus className="mr-1 h-3.5 w-3.5" />}
                            onClick={() =>
                              openMovement({
                                idVariante: i.IDVariante,
                                sku: i.SKU,
                                producto: i.Producto,
                                atributos: [i.Talla, i.Color, i.Presentacion].filter(Boolean).join(' · '),
                                existenciaFisica: i.ExistenciaFisica,
                                existenciaDisponible: i.ExistenciaDisponible,
                              })
                            }
                          >
                            Reabastecer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {low.data && low.data.items.length > 0 && <Pagination currentPage={low.data.pagina} totalRecords={low.data.totalRegistros} pageSize={low.data.tamanoPagina} onPageChange={setLowPage} />}
            </>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimiento" description="Entrada por compra o ajuste manual. El motivo es obligatorio." maxWidth="lg">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <VariantPicker value={variant} onChange={setVariant} />
          <Select
            label="Tipo de movimiento"
            value={tipo}
            onChange={e => setTipo(e.target.value as Tipo)}
            options={[
              { value: 'ENTRADA_COMPRA', label: 'Entrada por compra (reabastecimiento)' },
              { value: 'AJUSTE', label: 'Ajuste manual (merma o conteo físico)' },
            ]}
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Cantidad de unidades</span>
            <input
              inputMode="numeric"
              value={cantidad}
              onChange={e => setCantidad(e.target.value.replace(tipo === 'AJUSTE' ? /[^0-9-]/g : /\D/g, ''))}
              placeholder={tipo === 'AJUSTE' ? 'Positivo suma, negativo resta' : 'Unidades que ingresan'}
              className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm tabular outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          {variant && resulting !== null && (
            <p className={`rounded-xl px-4 py-3 text-sm font-semibold tabular ${negative ? 'bg-rose-50 text-rose-700' : 'bg-brand-soft text-brand'}`} role="status">
              {variant.existenciaFisica} {delta >= 0 ? '+' : '−'} {Math.abs(delta)} = <strong>{resulting}</strong> unidades en bodega
              {negative && ' · el ajuste no puede dejar la existencia en negativo'}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Motivo (obligatorio)</span>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej. Compra a proveedor, factura 12345"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
            {motivo.length > 0 && !motivoOk && <p className="mt-1 text-xs font-semibold text-rose-600">Escribe al menos 5 caracteres.</p>}
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending} disabled={!variant || invalidQty || negative || !motivoOk}>Registrar movimiento</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
