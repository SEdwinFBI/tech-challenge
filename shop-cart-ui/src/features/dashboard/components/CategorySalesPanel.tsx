import React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CategorySales } from '../api/dashboardApi';
import { GRID, LABEL, SERIES, TOOLTIP_STYLE, compactQ } from '../lib/chartTheme';
import { formatMoney } from '@/shared/lib/formatters';
import { ChartCard } from './ChartCard';
import { DataTable } from './DataTable';
import { EmptyChart } from './EmptyChart';

interface CategorySalesPanelProps {
  categorias: CategorySales[];
  tabla: boolean;
}

export const CategorySalesPanel: React.FC<CategorySalesPanelProps> = ({ categorias, tabla }) => (
  <ChartCard title="Ventas netas por categoría">
    {categorias.length === 0 || categorias.every(c => c.VentasNetasQuetzales <= 0) ? (
      <EmptyChart text="Sin ventas en este periodo." />
    ) : tabla ? (
      <DataTable
        caption="Ventas netas por categoría"
        headers={['Categoría', 'Unidades', 'Ventas netas']}
        rows={categorias.map(c => ({ key: String(c.IDCategoria), cells: [c.Categoria, c.UnidadesNetasVendidas, formatMoney(c.VentasNetasQuetzales)] }))}
      />
    ) : (
      <div className="w-full" style={{ height: Math.max(256, categorias.length * 44) }} role="img" aria-label="Ventas netas por categoría">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categorias} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="Categoria" width={128} tick={{ fontSize: 12, fill: LABEL }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#f5f5f4' }} formatter={(v: unknown) => [formatMoney(Number(v)), 'Ventas netas']} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="VentasNetasQuetzales" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList dataKey="VentasNetasQuetzales" position="right" formatter={(v: unknown) => compactQ(Number(v))} style={{ fontSize: 12, fill: LABEL, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </ChartCard>
);
