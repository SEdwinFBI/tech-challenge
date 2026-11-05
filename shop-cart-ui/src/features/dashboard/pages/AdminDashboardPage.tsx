import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Download, PackageCheck, Radio, Receipt, ShoppingCart, Table2, TrendingUp } from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { useDashboardStream } from '../hooks/useDashboardStream';
import { formatMoney } from '@/shared/lib/formatters';
import { Button, ErrorState, PageHeader, Skeleton } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';

type Periodo = 'HOY' | 'SEMANA' | 'MES' | 'ANIO';
type Metrica = 'ventas' | 'pedidos';

const PERIODOS: Array<{ id: Periodo; label: string }> = [
  { id: 'HOY', label: 'Hoy' },
  { id: 'SEMANA', label: 'Semana' },
  { id: 'MES', label: 'Mes' },
  { id: 'ANIO', label: 'Año' },
];

const SERIES = '#0e7c66';
const GRID = '#e7e5e4';
const AXIS = '#78716c';

const compactQ = (n: number) => (n >= 1000 ? `Q${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `Q${Math.round(n)}`);

const Kpi: React.FC<{ label: string; value: string; note: string; icon: React.ReactNode; tone: string }> = ({ label, value, note, icon, tone }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
    </div>
    <p className="text-2xl font-extrabold tabular text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </div>
);

const ChartCard: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, action, children }) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6" aria-label={title}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><BarChart3 className="h-4 w-4 text-brand" />{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyChart: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex h-64 items-center justify-center rounded-xl bg-canvas text-sm font-medium text-slate-500">{text}</div>
);

export const AdminDashboardPage: React.FC = () => {
  const [periodo, setPeriodo] = useState<Periodo>('MES');
  const [metrica, setMetrica] = useState<Metrica>('ventas');
  const [tabla, setTabla] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard', periodo],
    queryFn: () => dashboardApi.getSummary({ periodo }),
    staleTime: 30_000,
  });

  const live = useDashboardStream(() => {
    refetch();
  });

  const serie = useMemo(() => data?.serieTemporal ?? [], [data]);
  const categorias = useMemo(
    () => [...(data?.ventasPorCategoria ?? [])].sort((a, b) => b.VentasNetasQuetzales - a.VentasNetasQuetzales),
    [data],
  );
  const top10 = data?.top10Productos ?? [];
  const maxTop = Math.max(1, ...top10.map(p => p.IngresosNetosQuetzales));

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await dashboardApi.exportExcel(periodo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-shopcart-${periodo}-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Reporte exportado');
    } catch {
      toast.error('No se pudo exportar el reporte a Excel');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState title="Error al cargar métricas" onRetry={() => refetch()} />;
  }

  const k = data.kpis;
  const periodoLabel = PERIODOS.find(p => p.id === periodo)?.label ?? periodo;
  const metricKey = metrica === 'ventas' ? 'VentasQuetzales' : 'NumeroPedidos';
  const hasSeries = serie.some(p => p.VentasQuetzales > 0 || p.NumeroPedidos > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Solo pedidos entregados, menos devoluciones."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                live ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
              }`}
              role="status"
            >
              <Radio className={`h-3.5 w-3.5 ${live ? 'animate-pulse' : ''}`} />
              {live ? 'En vivo' : 'Sin conexión'}
            </span>
            <div role="group" aria-label="Periodo" className="flex rounded-xl bg-slate-200 p-0.5 text-xs font-bold">
              {PERIODOS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={periodo === p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`rounded-lg px-3 py-1.5 transition ${periodo === p.id ? 'bg-white text-brand shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setTabla(t => !t)} leftIcon={<Table2 className="mr-1.5 h-4 w-4" />} aria-pressed={tabla}>
              {tabla ? 'Ver gráficas' : 'Ver como tabla'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} loading={exporting} leftIcon={<Download className="mr-1.5 h-4 w-4" />}>
              Excel
            </Button>
          </div>
        }
      />

      {data.desdeCache && <p className="text-xs font-semibold text-slate-500">Datos en caché.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Ventas netas · ${periodoLabel}`} value={formatMoney(k.VentasNetasQuetzales)} note="Sin devoluciones" icon={<TrendingUp className="h-4 w-4" />} tone="bg-indigo-50 text-indigo-700" />
        <Kpi label="Pedidos completados" value={String(k.TotalPedidosCompletados)} note="Excluye cancelados y pendientes" icon={<PackageCheck className="h-4 w-4" />} tone="bg-emerald-50 text-emerald-700" />
        <Kpi label="Ticket promedio" value={formatMoney(k.TicketPromedioQuetzales)} note="Ventas entre pedidos completados" icon={<Receipt className="h-4 w-4" />} tone="bg-amber-50 text-amber-700" />
        <Kpi label="Carritos abandonados" value={String(k.CarritosAbandonadosActuales)} note="Con productos y sin actividad reciente" icon={<ShoppingCart className="h-4 w-4" />} tone="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title={metrica === 'ventas' ? 'Ventas en quetzales' : 'Pedidos completados'}
          subtitle={`Periodo: ${periodoLabel}`}
          action={
            <div role="group" aria-label="Métrica" className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
              {([['ventas', 'Quetzales'], ['pedidos', 'Pedidos']] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={metrica === id} onClick={() => setMetrica(id)} className={`rounded-md px-2.5 py-1 ${metrica === id ? 'bg-white text-brand shadow-xs' : 'text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {!hasSeries ? (
            <EmptyChart text="Sin ventas en este periodo." />
          ) : tabla ? (
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm tabular">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2">Periodo</th><th className="px-4 py-2 text-right">Pedidos</th><th className="px-4 py-2 text-right">Ventas</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {serie.map(p => <tr key={p.Periodo}><td className="px-4 py-2">{p.Periodo}</td><td className="px-4 py-2 text-right">{p.NumeroPedidos}</td><td className="px-4 py-2 text-right">{formatMoney(p.VentasQuetzales)}</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 w-full" role="img" aria-label={`Gráfica de ${metrica === 'ventas' ? 'ventas en quetzales' : 'pedidos'} por periodo`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="serieFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="Periodo" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={metrica === 'ventas' ? 52 : 32} allowDecimals={false} tickFormatter={(v: number) => (metrica === 'ventas' ? compactQ(v) : String(v))} />
                  <Tooltip
                    cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
                    formatter={(v: unknown) => [metrica === 'ventas' ? formatMoney(Number(v)) : `${Number(v)} pedidos`, metrica === 'ventas' ? 'Ventas' : 'Pedidos']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey={metricKey} stroke={SERIES} strokeWidth={2} fill="url(#serieFill)" dot={serie.length <= 14 ? { r: 3, fill: '#fff', stroke: SERIES, strokeWidth: 2 } : false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Ventas netas por categoría">
          {categorias.length === 0 || categorias.every(c => c.VentasNetasQuetzales <= 0) ? (
            <EmptyChart text="Sin ventas en este periodo." />
          ) : tabla ? (
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm tabular">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2">Categoría</th><th className="px-4 py-2 text-right">Unidades</th><th className="px-4 py-2 text-right">Ventas netas</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {categorias.map(c => <tr key={c.IDCategoria}><td className="px-4 py-2">{c.Categoria}</td><td className="px-4 py-2 text-right">{c.UnidadesNetasVendidas}</td><td className="px-4 py-2 text-right">{formatMoney(c.VentasNetasQuetzales)}</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="w-full" style={{ height: Math.max(256, categorias.length * 44) }} role="img" aria-label="Ventas netas por categoría">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorias} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 0 }} barCategoryGap={10}>
                  <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="Categoria" width={128} tick={{ fontSize: 12, fill: '#44403c' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f5f5f4' }}
                    formatter={(v: unknown) => [formatMoney(Number(v)), 'Ventas netas']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }}
                  />
                  <Bar dataKey="VentasNetasQuetzales" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="VentasNetasQuetzales" position="right" formatter={(v: unknown) => compactQ(Number(v))} style={{ fontSize: 12, fill: '#44403c', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Los 10 productos más vendidos" subtitle={`Periodo: ${periodoLabel}`}>
        {top10.length === 0 ? (
          <EmptyChart text="Sin ventas en este periodo." />
        ) : (
          <ol className="divide-y divide-slate-100">
            {top10.map((p, i) => (
              <li key={p.IDProducto} className="flex items-center gap-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-700">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-bold text-slate-900">{p.Producto}</p>
                    <p className="shrink-0 text-sm font-extrabold tabular text-slate-900">{formatMoney(p.IngresosNetosQuetzales)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, (p.IngresosNetosQuetzales / maxTop) * 100)}%`, background: SERIES }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{p.UnidadesNetasVendidas} {p.UnidadesNetasVendidas === 1 ? 'unidad' : 'unidades'} netas</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </ChartCard>
    </div>
  );
};
