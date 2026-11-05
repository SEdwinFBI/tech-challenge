import React from 'react';
import { CheckCircle2, Circle, PackageCheck, Truck, XCircle, Undo2, Clock, CreditCard } from 'lucide-react';
import { formatDateTime } from '@/shared/lib/formatters';
import { orderStatusMeta } from '@/shared/lib/orderStatus';
import type { OrderHistoryEntry } from '@/shared/types/domain';

const ICONS: Record<string, React.ReactNode> = {
  PAGADO: <CreditCard className="h-4 w-4" />,
  EN_PREPARACION: <Clock className="h-4 w-4" />,
  DESPACHADO: <Truck className="h-4 w-4" />,
  ENTREGADO: <PackageCheck className="h-4 w-4" />,
  CANCELADO: <XCircle className="h-4 w-4" />,
  DEVUELTO_PARCIAL: <Undo2 className="h-4 w-4" />,
  DEVUELTO_TOTAL: <Undo2 className="h-4 w-4" />,
};

const TONE_RING: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700',
  neutral: 'bg-slate-100 text-slate-600',
};

export interface OrderTimelineProps {
  history: OrderHistoryEntry[];
  showAuthor?: boolean;
  className?: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ history, showAuthor = false, className = '' }) => {
  const items = [...history].sort((a, b) => new Date(b.FechaCambio).getTime() - new Date(a.FechaCambio).getTime());
  if (items.length === 0) {
    return <p className={`text-sm text-slate-500 ${className}`}>Sin movimientos.</p>;
  }

  return (
    <ol className={`relative space-y-5 ${className}`}>
      {items.map((h, i) => {
        const meta = orderStatusMeta(h.EstadoNuevo);
        const isLast = i === items.length - 1;
        return (
          <li key={h.IDHistorial || i} className="relative flex gap-3">
            {!isLast && <span className="absolute left-4 top-9 -ml-px h-[calc(100%-1rem)] w-0.5 bg-slate-200" aria-hidden="true" />}
            <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_RING[meta.tone]}`}>
              {i === 0 && meta.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : ICONS[h.EstadoNuevo] ?? <Circle className="h-4 w-4" />}
            </span>
            <div className="min-w-0 pb-1">
              <p className="text-sm font-bold text-slate-900">{meta.label}</p>
              <p className="text-xs text-slate-500">{formatDateTime(h.FechaCambio)}</p>
              {h.EstadoAnterior && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Desde: {orderStatusMeta(h.EstadoAnterior).label}
                </p>
              )}
              {showAuthor && h.UsuarioResponsable && (
                <p className="text-xs text-slate-500">Por {h.UsuarioResponsable}</p>
              )}
              {h.Motivo && <p className="mt-1 text-xs italic text-slate-600">“{h.Motivo}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
