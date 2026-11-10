import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentStateCount } from '../api/dashboardApi';
import { GRID, LABEL, PAYMENT_STATES, TOOLTIP_STYLE, resolveStates } from '../lib/chartTheme';
import { formatMoney } from '@/shared/lib/formatters';
import { ChartCard } from './ChartCard';
import { DataTable } from './DataTable';
import { EmptyChart } from './EmptyChart';

interface PaymentStatusPanelProps {
  pagos: PaymentStateCount[];
  periodoLabel: string;
  tabla: boolean;
}

export const PaymentStatusPanel: React.FC<PaymentStatusPanelProps> = ({ pagos, periodoLabel, tabla }) => {
  const estados = useMemo(() => resolveStates(PAYMENT_STATES, pagos, r => r.TotalIntentos, r => r.MontoQuetzales), [pagos]);
  const total = estados.reduce((s, e) => s + e.count, 0);
  const resumen = estados.map(e => `${e.label}: ${e.count}`).join(', ');

  return (
    <ChartCard title="Pagos por estado" subtitle={`Intentos de pago · Periodo: ${periodoLabel}`}>
      {total === 0 ? (
        <EmptyChart text="Sin intentos de pago en este periodo." />
      ) : tabla ? (
        <DataTable
          caption="Intentos de pago por estado"
          headers={['Estado', 'Intentos', 'Monto']}
          rows={estados.map(e => ({ key: e.code, cells: [e.label, e.count, formatMoney(e.amount)] }))}
        />
      ) : (
        <div className="w-full" style={{ height: Math.max(256, estados.length * 48) }} role="img" aria-label={`Intentos de pago por estado. Total ${total}. ${resumen}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={estados} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }} barCategoryGap={10}>
              <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: LABEL }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#f5f5f4' }}
                formatter={(v: unknown, _n: unknown, item: { payload?: { amount?: number } }) => [`${v} · ${formatMoney(item.payload?.amount ?? 0)}`, 'Intentos']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22} minPointSize={2}>
                {estados.map(e => <Cell key={e.code} fill={e.color} />)}
                <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: LABEL, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
};
