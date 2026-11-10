import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { OrderStateCount } from '../api/dashboardApi';
import { ORDER_STATES, TOOLTIP_STYLE, resolveStates } from '../lib/chartTheme';
import { formatMoney, plural } from '@/shared/lib/formatters';
import { ChartCard } from './ChartCard';
import { DataTable } from './DataTable';
import { EmptyChart } from './EmptyChart';

interface OrderStatusPanelProps {
  pedidos: OrderStateCount[];
  periodoLabel: string;
  tabla: boolean;
}

export const OrderStatusPanel: React.FC<OrderStatusPanelProps> = ({ pedidos, periodoLabel, tabla }) => {
  const estados = useMemo(() => resolveStates(ORDER_STATES, pedidos, r => r.TotalPedidos, r => r.MontoQuetzales), [pedidos]);
  const total = estados.reduce((s, e) => s + e.count, 0);
  const slices = estados.filter(e => e.count > 0);
  const resumen = slices.map(e => `${e.label}: ${e.count}`).join(', ');

  return (
    <ChartCard title="Pedidos por estado" subtitle={`Periodo: ${periodoLabel}`}>
      {total === 0 ? (
        <EmptyChart text="Sin pedidos en este periodo." />
      ) : tabla ? (
        <DataTable
          caption="Pedidos por estado"
          headers={['Estado', 'Pedidos', 'Monto']}
          rows={estados.map(e => ({ key: e.code, cells: [e.label, e.count, formatMoney(e.amount)] }))}
        />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-52 w-52 shrink-0" role="img" aria-label={`Pedidos por estado. Total ${total}. ${resumen}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="count" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                  {slices.map(s => <Cell key={s.code} fill={s.color} />)}
                </Pie>
                <Tooltip formatter={(v: unknown, name: unknown) => [plural(Number(v), 'pedido'), String(name)]} contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
              <span className="text-2xl font-extrabold tabular text-slate-900">{total}</span>
              <span className="text-xs font-medium text-slate-500">{total === 1 ? 'pedido' : 'pedidos'}</span>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-1.5">
            {estados.map(e => (
              <li key={e.code} className={`flex items-center gap-2.5 text-sm ${e.count === 0 ? 'text-slate-500' : 'text-slate-900'}`}>
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: e.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="font-extrabold tabular">{e.count}</span>
                <span className="w-12 text-right text-xs tabular text-slate-500">{total > 0 ? `${Math.round((e.count / total) * 100)} %` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
};
