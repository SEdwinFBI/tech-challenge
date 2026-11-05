import React from 'react';
import { PartyPopper, Truck } from 'lucide-react';
import { formatMoney } from '@/shared/lib/formatters';

export interface FreeShippingProgressProps {
  /** Subtotal con descuento; el servidor compara contra este valor. */
  subtotalNeto: number;
  freeFrom: number | null | undefined;
  className?: string;
}

export const FreeShippingProgress: React.FC<FreeShippingProgressProps> = ({ subtotalNeto, freeFrom, className = '' }) => {
  if (!freeFrom || freeFrom <= 0) return null;
  const reached = subtotalNeto >= freeFrom;
  const pct = Math.min(100, Math.round((subtotalNeto / freeFrom) * 100));
  const missing = Math.max(0, freeFrom - subtotalNeto);

  return (
    <div className={`rounded-2xl p-4 ${reached ? 'bg-emerald-50' : 'bg-brand-soft'} ${className}`}>
      <p className={`flex items-center gap-2 text-sm font-bold ${reached ? 'text-emerald-800' : 'text-brand'}`}>
        {reached ? <PartyPopper className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
        {reached ? 'Tu envío es gratis' : `Te faltan ${formatMoney(missing)} para envío gratis`}
      </p>
      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Progreso hacia el envío gratis"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-emerald-500' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
