import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  max: number;
  min?: number;
  onChange: (next: number) => void;
  onRemove?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  max,
  min = 1,
  onChange,
  onRemove,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const atMin = value <= min;
  const atMax = value >= max;
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const useTrash = atMin && Boolean(onRemove);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} role="group" aria-label="Cantidad">
      <button
        type="button"
        disabled={disabled || (atMin && !onRemove)}
        onClick={() => (useTrash ? onRemove?.() : onChange(Math.max(min, value - 1)))}
        aria-label={useTrash ? 'Quitar del carrito' : 'Disminuir cantidad'}
        className={`${box} inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {useTrash ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular text-slate-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || atMax}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Aumentar cantidad"
        title={atMax ? `Máximo: ${max}` : undefined}
        className={`${box} inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};
