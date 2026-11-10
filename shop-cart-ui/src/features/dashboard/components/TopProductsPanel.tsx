import React from 'react';
import type { TopProduct } from '../api/dashboardApi';
import { SERIES } from '../lib/chartTheme';
import { formatMoney } from '@/shared/lib/formatters';
import { ChartCard } from './ChartCard';
import { DataTable } from './DataTable';
import { EmptyChart } from './EmptyChart';

interface TopProductsPanelProps {
  top10: TopProduct[];
  periodoLabel: string;
  tabla: boolean;
}

export const TopProductsPanel: React.FC<TopProductsPanelProps> = ({ top10, periodoLabel, tabla }) => {
  const maxTop = Math.max(1, ...top10.map(p => p.IngresosNetosQuetzales));

  return (
    <ChartCard title="Los 10 productos más vendidos" subtitle={`Periodo: ${periodoLabel}`}>
      {top10.length === 0 ? (
        <EmptyChart text="Sin ventas en este periodo." />
      ) : tabla ? (
        <DataTable
          caption="Los 10 productos más vendidos"
          headers={['Producto', 'Unidades netas', 'Ingresos netos']}
          rows={top10.map(p => ({ key: String(p.IDProducto), cells: [p.Producto, p.UnidadesNetasVendidas, formatMoney(p.IngresosNetosQuetzales)] }))}
        />
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
  );
};
