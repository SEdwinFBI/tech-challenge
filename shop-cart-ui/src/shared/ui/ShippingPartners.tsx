import React from 'react';
import { SHIPPING_PARTNERS } from '@/shared/lib/shipping';

export const ShippingPartners: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
    <span className="text-xs text-slate-500">Enviamos con</span>
    {SHIPPING_PARTNERS.map(name => (
      <span key={name} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{name}</span>
    ))}
  </div>
);
