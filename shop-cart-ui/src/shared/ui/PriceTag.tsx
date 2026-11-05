import React from 'react';
import { splitAmount } from '@/shared/lib/pricing';
import { formatMoney } from '@/shared/lib/formatters';

export interface PriceTagProps {
  amount: number | null | undefined;
  compareAt?: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'sale';
  from?: boolean;
  className?: string;
}

const sizes = {
  sm: { big: 'text-base', sup: 'text-[10px]', old: 'text-xs' },
  md: { big: 'text-xl', sup: 'text-xs', old: 'text-xs' },
  lg: { big: 'text-3xl', sup: 'text-sm', old: 'text-sm' },
  xl: { big: 'text-4xl', sup: 'text-base', old: 'text-base' },
} as const;

export const PriceTag: React.FC<PriceTagProps> = ({
  amount,
  compareAt,
  size = 'md',
  tone = 'default',
  from = false,
  className = '',
}) => {
  const { entero, centavos } = splitAmount(amount);
  const s = sizes[size];
  const color = tone === 'sale' ? 'text-sale' : 'text-slate-900';
  const accessible = formatMoney(amount);

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0 tabular ${className}`}>
      {from && <span className="text-[11px] font-medium text-slate-500">Desde</span>}
      <span className={`${color} font-extrabold leading-none ${s.big}`} aria-label={accessible}>
        <span aria-hidden="true">
          Q{entero}
          <sup className={`${s.sup} font-bold align-super`}>.{centavos}</sup>
        </span>
      </span>
      {compareAt != null && compareAt > 0 && (
        <span className={`${s.old} text-slate-400 line-through font-medium`}>
          <span className="sr-only">Antes </span>
          {formatMoney(compareAt)}
        </span>
      )}
    </div>
  );
};

export const DiscountBadge: React.FC<{ percent: number; className?: string }> = ({ percent, className = '' }) => {
  if (!percent || percent < 1) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md bg-sale px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm ${className}`}
    >
      -{percent}%
    </span>
  );
};
