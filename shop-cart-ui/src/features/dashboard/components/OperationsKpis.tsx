import React from 'react';
import { CreditCard, PackageSearch, TicketPercent, Truck, Undo2, UserPlus } from 'lucide-react';
import type { PaymentStateCount } from '../api/dashboardApi';
import { formatPercent, rejectionRate } from '../lib/dashboardView';
import type { DashboardKpiValues } from '../lib/dashboardView';
import { formatMoney, plural } from '@/shared/lib/formatters';
import { KpiCard } from './KpiCard';

interface OperationsKpisProps {
  kpis: DashboardKpiValues;
  pagos: PaymentStateCount[];
}

export const OperationsKpis: React.FC<OperationsKpisProps> = ({ kpis, pagos }) => {
  const rechazo = rejectionRate(pagos);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label="Pedidos por entregar"
        value={String(kpis.PedidosPorEntregar)}
        note="Pagados, en preparación o despachados"
        icon={<Truck className="h-4 w-4" />}
        tone="bg-sky-50 text-sky-700"
        to="/admin/pedidos"
        linkLabel="Ver pedidos"
      />
      <KpiCard label="Clientes nuevos" value={String(kpis.ClientesNuevos)} note="Registrados en el periodo" icon={<UserPlus className="h-4 w-4" />} tone="bg-emerald-50 text-emerald-700" />
      <KpiCard
        label="Devoluciones"
        value={String(kpis.DevolucionesCantidad)}
        note={`${formatMoney(kpis.DevolucionesMontoQuetzales)} reembolsados`}
        icon={<Undo2 className="h-4 w-4" />}
        tone="bg-rose-50 text-rose-700"
      />
      <KpiCard
        label="Descuento por cupones"
        value={formatMoney(kpis.DescuentoCuponesQuetzales)}
        note={`${plural(kpis.PedidosConCupon, 'pedido')} con cupón`}
        icon={<TicketPercent className="h-4 w-4" />}
        tone="bg-amber-50 text-amber-700"
      />
      <KpiCard
        label="Variantes con existencias bajas"
        value={String(kpis.VariantesExistenciasBajas)}
        note="No depende del periodo"
        icon={<PackageSearch className="h-4 w-4" />}
        tone="bg-orange-50 text-orange-700"
        to="/admin/inventario"
        linkLabel="Ver inventario"
      />
      <KpiCard
        label="Tasa de rechazo de pagos"
        value={formatPercent(rechazo.rate)}
        note={rechazo.total > 0 ? `${rechazo.rejected} de ${plural(rechazo.total, 'intento')}` : 'Sin intentos de pago'}
        icon={<CreditCard className="h-4 w-4" />}
        tone="bg-slate-100 text-slate-700"
      />
    </div>
  );
};
