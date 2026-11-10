import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeSeriesPoint } from '../api/dashboardApi';
import { AXIS, GRID, SERIES, TOOLTIP_STYLE, compactQ } from '../lib/chartTheme';
import { formatMoney, plural } from '@/shared/lib/formatters';
import { ChartCard } from './ChartCard';
import { DataTable } from './DataTable';
import { EmptyChart } from './EmptyChart';

type Metrica = 'ventas' | 'pedidos';

interface SalesSeriesPanelProps {
  serie: TimeSeriesPoint[];
  periodoLabel: string;
  tabla: boolean;
}

export const SalesSeriesPanel: React.FC<SalesSeriesPanelProps> = ({ serie, periodoLabel, tabla }) => {
  const [metrica, setMetrica] = useState<Metrica>('ventas');
  const metricKey = metrica === 'ventas' ? 'VentasQuetzales' : 'NumeroPedidos';
  const hasSeries = serie.some(p => p.VentasQuetzales > 0 || p.NumeroPedidos > 0);

  return (
    <ChartCard
      title={metrica === 'ventas' ? 'Ventas en quetzales' : 'Pedidos con venta'}
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
        <DataTable
          caption="Ventas y pedidos por periodo"
          headers={['Periodo', 'Pedidos', 'Ventas']}
          rows={serie.map(p => ({ key: p.Periodo, cells: [p.Periodo, p.NumeroPedidos, formatMoney(p.VentasQuetzales)] }))}
        />
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
                formatter={(v: unknown) => [metrica === 'ventas' ? formatMoney(Number(v)) : plural(Number(v), 'pedido'), metrica === 'ventas' ? 'Ventas' : 'Pedidos']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Area type="monotone" dataKey={metricKey} stroke={SERIES} strokeWidth={2} fill="url(#serieFill)" dot={serie.length <= 14 ? { r: 3, fill: '#fff', stroke: SERIES, strokeWidth: 2 } : false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
};
