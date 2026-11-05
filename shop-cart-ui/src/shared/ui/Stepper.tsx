import React from 'react';
import { Check } from 'lucide-react';

export interface StepperProps {
  steps: string[];
  current: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, current, className = '' }) => (
  <ol className={`flex items-center gap-2 text-sm ${className}`} aria-label="Progreso del pedido">
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              done ? 'bg-brand text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={active ? 'font-bold text-slate-900' : done ? 'font-medium text-slate-700' : 'text-slate-400'}>
            {label}
          </span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-5 bg-slate-300 sm:w-8" aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);
