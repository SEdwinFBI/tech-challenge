import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import type { Periodo } from '../api/dashboardApi';
import { CategorySalesPanel } from '../components/CategorySalesPanel';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { DashboardToolbar } from '../components/DashboardToolbar';
import { OperationsKpis } from '../components/OperationsKpis';
import { OrderStatusPanel } from '../components/OrderStatusPanel';
import { PaymentStatusPanel } from '../components/PaymentStatusPanel';
import { SalesKpis } from '../components/SalesKpis';
import { SalesSeriesPanel } from '../components/SalesSeriesPanel';
import { TopProductsPanel } from '../components/TopProductsPanel';
import { useDashboardStream } from '../hooks/useDashboardStream';
import { PERIODOS, normalizeSummary } from '../lib/dashboardView';
import { queryKeys } from '@/shared/lib/queryKeys';
import { ErrorState, PageHeader } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';

export const AdminDashboardPage: React.FC = () => {
  const [periodo, setPeriodo] = useState<Periodo>('MES');
  const [tabla, setTabla] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.dashboard.summary(periodo),
    queryFn: () => dashboardApi.getSummary({ periodo }),
    staleTime: 30_000,
  });

  const live = useDashboardStream(() => {
    void refetch();
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const view = useMemo(() => (data ? normalizeSummary(data) : null), [data]);

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

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data || !view) {
    return <ErrorState title="Error al cargar métricas" onRetry={() => refetch()} />;
  }

  const periodoLabel = PERIODOS.find(p => p.id === periodo)?.label ?? periodo;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ventas de pedidos pagados (sin cancelados), descontando devoluciones."
        action={
          <DashboardToolbar
            live={live}
            updatedAt={data.generadoEn ?? dataUpdatedAt}
            now={now}
            isFetching={isFetching}
            onRefresh={() => { void refetch(); }}
            periodo={periodo}
            onPeriodo={setPeriodo}
            tabla={tabla}
            onToggleTabla={() => setTabla(t => !t)}
            exporting={exporting}
            onExport={exportExcel}
          />
        }
      />

      {view.parcial && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Algunos indicadores aún no están disponibles en esta respuesta. Se completan al actualizar.
        </p>
      )}

      <SalesKpis kpis={view.kpis} periodoLabel={periodoLabel} />
      <OperationsKpis kpis={view.kpis} pagos={view.pagosPorEstado} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SalesSeriesPanel serie={view.serie} periodoLabel={periodoLabel} tabla={tabla} />
        <CategorySalesPanel categorias={view.categorias} tabla={tabla} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <OrderStatusPanel pedidos={view.pedidosPorEstado} periodoLabel={periodoLabel} tabla={tabla} />
        <PaymentStatusPanel pagos={view.pagosPorEstado} periodoLabel={periodoLabel} tabla={tabla} />
      </div>

      <TopProductsPanel top10={view.top10} periodoLabel={periodoLabel} tabla={tabla} />
    </div>
  );
};
