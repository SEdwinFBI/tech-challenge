import React from 'react';
import { ShoppingCart } from 'lucide-react';

export const BrandMark: React.FC<{ className?: string; light?: boolean }> = ({ className = '', light = true }) => (
  <span className={`flex items-center gap-2.5 ${className}`}>
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cta text-cta-fg shadow-sm">
      <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
    </span>
    <span className="leading-none">
      <span className={`block text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>ShopCart</span>
      <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${light ? 'text-white/70' : 'text-brand'}`}>Don Arturo</span>
    </span>
  </span>
);
