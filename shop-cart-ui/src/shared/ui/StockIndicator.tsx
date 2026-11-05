import React from 'react';

export interface StockIndicatorProps {
  available: number;
  lowThreshold?: number;
  className?: string;
}

export const StockIndicator: React.FC<StockIndicatorProps> = ({ available, lowThreshold = 5, className = '' }) => {
  if (available <= 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 ${className}`}>
        <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
        Agotado
      </span>
    );
  }
  if (available <= lowThreshold) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 ${className}`}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
        Solo quedan {available}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 ${className}`}>
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      En existencia
    </span>
  );
};
