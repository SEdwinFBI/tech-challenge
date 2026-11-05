import React from 'react';
import { formatMoney } from '@/shared/lib/formatters';
import { splitIva } from '@/shared/lib/pricing';

export interface IvaBreakdownProps {
  total: number;
  /** Si el servidor manda el desglose (pedidos), se usa tal cual. */
  base?: number;
  iva?: number;
  className?: string;
}

export const IvaBreakdown: React.FC<IvaBreakdownProps> = ({ total, base, iva, className = '' }) => {
  const parts = base != null && iva != null && (base > 0 || iva > 0) ? { base, iva } : splitIva(total);
  return (
    <dl className={`space-y-1 text-xs text-slate-500 tabular ${className}`}>
      <div className="flex justify-between">
        <dt>Base imponible</dt>
        <dd>{formatMoney(parts.base)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>IVA 12% incluido</dt>
        <dd>{formatMoney(parts.iva)}</dd>
      </div>
    </dl>
  );
};
