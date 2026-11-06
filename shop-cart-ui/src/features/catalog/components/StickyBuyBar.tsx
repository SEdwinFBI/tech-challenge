import React from 'react';
import { Loader2, ShoppingCart } from 'lucide-react';
import { PriceTag } from '@/shared/ui/PriceTag';

export interface StickyBuyBarProps {
  visible: boolean;
  name: string;
  price: number;
  compareAt?: number | null;
  disabled: boolean;
  loading: boolean;
  onAdd: () => void;
  offline?: boolean;
}

export const StickyBuyBar: React.FC<StickyBuyBarProps> = ({ visible, name, price, compareAt, disabled, loading, onAdd, offline }) => (
  <div
    className={`fixed inset-x-0 bottom-14 z-30 px-3 transition duration-300 lg:bottom-4 ${
      visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
    }`}
    aria-hidden={!visible}
  >
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full bg-white/95 py-2 pl-5 pr-2 shadow-lift ring-1 ring-slate-200 backdrop-blur">
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{name}</p>
      <div className="flex items-center gap-3">
        <PriceTag amount={price} compareAt={compareAt} tone={compareAt ? 'sale' : 'default'} size="md" />
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          disabled={disabled || loading || offline}
          title={offline ? 'Sin conexión' : undefined}
          onClick={onAdd}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-cta px-5 text-sm font-extrabold text-cta-fg transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          Agregar
        </button>
      </div>
    </div>
  </div>
);
