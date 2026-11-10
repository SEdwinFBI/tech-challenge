import React from 'react';
import { PackageCheck, Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import type { DashboardKpiValues } from '../lib/dashboardView';
import { formatMoney } from '@/shared/lib/formatters';
import { KpiCard } from './KpiCard';

export const SalesKpis: React.FC<{ kpis: DashboardKpiValues; periodoLabel: string }> = ({ kpis, periodoLabel }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard label={`Ventas netas · ${periodoLabel}`} value={formatMoney(kpis.VentasNetasQuetzales)} icon={<TrendingUp className="h-4 w-4" />} tone="bg-indigo-50 text-indigo-700" />
    <KpiCard label="Pedidos con venta" value={String(kpis.TotalPedidosCompletados)} note="Pedidos pagados, sin cancelados" icon={<PackageCheck className="h-4 w-4" />} tone="bg-emerald-50 text-emerald-700" />
    <KpiCard label="Ticket promedio" value={formatMoney(kpis.TicketPromedioQuetzales)} note="Ventas ÷ pedidos con venta" icon={<Receipt className="h-4 w-4" />} tone="bg-amber-50 text-amber-700" />
    <KpiCard label="Carritos abandonados (ahora)" value={String(kpis.CarritosAbandonadosActuales)} note="No depende del periodo" icon={<ShoppingCart className="h-4 w-4" />} tone="bg-rose-50 text-rose-700" />
  </div>
);
